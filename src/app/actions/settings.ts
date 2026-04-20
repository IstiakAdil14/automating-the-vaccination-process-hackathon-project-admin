"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import { Vaccine } from "@/models/Vaccine";
import { Admin } from "@/models/Admin";
import { PlatformConfig, SettingsAudit, DEFAULT_PLATFORM_CONFIG } from "@/models/Settings";
import { requireRole } from "@/lib/getAdminSession";
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS, type AdminRole, type Permission } from "@/lib/permissions";
import type { ActionResult } from "./centers";

/* --- Helpers ------------------------------------------------------------------ */
async function auditLog(
  adminId: string,
  adminName: string,
  section: string,
  key: string,
  oldValue: unknown,
  newValue: unknown,
  irreversible = false
) {
  await SettingsAudit.create({ adminId, adminName, section, key, oldValue, newValue, irreversible });
}

function generateVaccineId(): string {
  return `VAC-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

/* --- verifySecondAdmin -------------------------------------------------------- */
export async function verifySecondAdmin(email: string, password: string): Promise<ActionResult<void>> {
  await connectDB();
  const admin = await Admin.findOne({ email: email.toLowerCase(), role: ROLES.SUPER_ADMIN }).select("+hashedPassword");
  if (!admin) return { ok: false, error: "Admin not found or insufficient role" };
  const valid = await admin.comparePassword(password);
  if (!valid) return { ok: false, error: "Invalid credentials" };
  return { ok: true, data: undefined };
}

/* -------------------------------------------------------------------------------
   VACCINE MASTER LIST
------------------------------------------------------------------------------- */
export interface VaccineInput {
  name:              string;
  shortName:         string;
  whoCode?:          string;
  manufacturer?:     string;
  doses:             number;
  intervalDays:      number[];
  minAge:            number;
  maxAge?:           number;
  contraindications: string[];
  minCelsius?:       number;
  maxCelsius?:       number;
}

export async function getVaccines(): Promise<ActionResult<object[]>> {
  await connectDB();
  const docs = await Vaccine.find().sort({ name: 1 }).lean();
  return { ok: true, data: docs.map((v) => ({ ...v, _id: String(v._id) })) };
}

export async function createVaccine(input: VaccineInput): Promise<ActionResult<void>> {
  const session = await requireRole([ROLES.SUPER_ADMIN]);
  await connectDB();

  const exists = await Vaccine.findOne({ $or: [{ name: input.name }, { shortName: input.shortName.toUpperCase() }] });
  if (exists) return { ok: false, error: "Vaccine with this name or short name already exists" };

  const vaccine = await Vaccine.create({
    vaccineId:         generateVaccineId(),
    name:              input.name,
    shortName:         input.shortName.toUpperCase(),
    whoCode:           input.whoCode,
    manufacturer:      input.manufacturer,
    schedule:          { doses: input.doses, intervalDays: input.intervalDays },
    ageEligibility:    { minYears: input.minAge, maxYears: input.maxAge },
    contraindications: input.contraindications,
    storageTemp:       { minCelsius: input.minCelsius ?? 2, maxCelsius: input.maxCelsius ?? 8 },
    isActive:          true,
  });

  await auditLog(session.user.id, session.user.name, "vaccines", "create", null, vaccine.vaccineId);
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function updateVaccine(vaccineId: string, patch: Partial<VaccineInput & { isActive: boolean }>): Promise<ActionResult<void>> {
  const session = await requireRole([ROLES.SUPER_ADMIN]);
  await connectDB();

  const vaccine = await Vaccine.findOne({ vaccineId });
  if (!vaccine) return { ok: false, error: "Vaccine not found" };

  const old = { name: vaccine.name, isActive: vaccine.isActive };

  if (patch.name)              vaccine.name              = patch.name;
  if (patch.shortName)         vaccine.shortName         = patch.shortName.toUpperCase();
  if (patch.whoCode !== undefined) vaccine.whoCode       = patch.whoCode;
  if (patch.doses !== undefined)   vaccine.schedule.doses = patch.doses;
  if (patch.intervalDays)      vaccine.schedule.intervalDays = patch.intervalDays;
  if (patch.minAge !== undefined)  vaccine.ageEligibility.minYears = patch.minAge;
  if (patch.maxAge !== undefined)  vaccine.ageEligibility.maxYears = patch.maxAge;
  if (patch.contraindications) vaccine.contraindications = patch.contraindications;
  if (patch.isActive !== undefined) vaccine.isActive     = patch.isActive;

  await vaccine.save();
  await auditLog(session.user.id, session.user.name, "vaccines", vaccineId, old, patch);
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

/* -------------------------------------------------------------------------------
   RBAC
------------------------------------------------------------------------------- */
export interface RolePermissionsMap { [role: string]: Permission[] }

export async function getRolePermissions(): Promise<ActionResult<RolePermissionsMap>> {
  // Return current in-memory defaults (in production: load from DB overrides)
  return { ok: true, data: ROLE_PERMISSIONS as unknown as RolePermissionsMap };
}

export async function updateRolePermissions(
  role: AdminRole,
  permissions: Permission[],
  confirmedByAdminEmail: string,
  confirmedByAdminPassword: string
): Promise<ActionResult<void>> {
  const session = await requireRole([ROLES.SUPER_ADMIN]);

  // Second admin confirmation
  const verify = await verifySecondAdmin(confirmedByAdminEmail, confirmedByAdminPassword);
  if (!verify.ok) return { ok: false, error: `Second admin verification failed: ${verify.error}` };

  await connectDB();

  // Update all admins with this role
  await Admin.updateMany({ role }, { $set: { permissions } });

  await auditLog(
    session.user.id, session.user.name,
    "rbac", role,
    ROLE_PERMISSIONS[role],
    permissions,
    true // irreversible - affects all users
  );

  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

/* -------------------------------------------------------------------------------
   PLATFORM POLICIES
------------------------------------------------------------------------------- */
export async function getPlatformPolicies(): Promise<ActionResult<Record<string, unknown>>> {
  await connectDB();

  const docs = await PlatformConfig.find().lean();
  const config: Record<string, unknown> = { ...DEFAULT_PLATFORM_CONFIG };
  docs.forEach((d) => { config[d.key] = d.value; });

  return { ok: true, data: config };
}

export async function updatePlatformPolicy(
  key: string,
  value: unknown
): Promise<ActionResult<void>> {
  const session = await requireRole([ROLES.SUPER_ADMIN]);
  await connectDB();

  const existing = await PlatformConfig.findOne({ key });
  const oldValue = existing?.value ?? DEFAULT_PLATFORM_CONFIG[key];

  await PlatformConfig.findOneAndUpdate(
    { key },
    { $set: { key, value, updatedBy: session.user.id } },
    { upsert: true }
  );

  await auditLog(session.user.id, session.user.name, "policies", key, oldValue, value);
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

/* -------------------------------------------------------------------------------
   API KEYS
------------------------------------------------------------------------------- */
export interface ApiKeyInfo {
  service:      string;
  maskedKey:    string;
  lastUsed?:    string;
  requestsMonth: number;
}

export async function getApiKeyInfo(): Promise<ActionResult<ApiKeyInfo[]>> {
  // In production: fetch from secrets manager / DB
  const services = [
    { service: "OpenAI",     envKey: "OPENAI_API_KEY" },
    { service: "Google Maps",envKey: "GOOGLE_MAPS_API_KEY" },
    { service: "Twilio",     envKey: "TWILIO_AUTH_TOKEN" },
    { service: "SendGrid",   envKey: "SENDGRID_API_KEY" },
  ];

  const data: ApiKeyInfo[] = services.map(({ service, envKey }) => {
    const key = process.env[envKey] ?? "";
    return {
      service,
      maskedKey:     key.length > 4 ? `${"-".repeat(key.length - 4)}${key.slice(-4)}` : "Not configured",
      lastUsed:      undefined,
      requestsMonth: 0,
    };
  });

  return { ok: true, data };
}

export async function rotateApiKey(
  service: string,
  confirmedByAdminEmail: string,
  confirmedByAdminPassword: string
): Promise<ActionResult<void>> {
  const session = await requireRole([ROLES.SUPER_ADMIN]);

  const verify = await verifySecondAdmin(confirmedByAdminEmail, confirmedByAdminPassword);
  if (!verify.ok) return { ok: false, error: `Second admin verification failed: ${verify.error}` };

  // In production: call secrets manager to rotate key
  await auditLog(session.user.id, session.user.name, "api_keys", service, "***", "ROTATED", true);
  return { ok: true, data: undefined };
}

/* -------------------------------------------------------------------------------
   LOCALIZATION
------------------------------------------------------------------------------- */
export interface LocaleString {
  key:     string;
  en:      string;
  bn?:     string;
  status:  "translated" | "pending";
}

// Mock locale strings - in production load from DB or JSON files
const LOCALE_STRINGS: LocaleString[] = [
  { key: "nav.dashboard",       en: "Dashboard",              bn: "----------",       status: "translated" },
  { key: "nav.centers",         en: "Centers",                bn: "-------",           status: "translated" },
  { key: "nav.staff",           en: "Staff",                  bn: "-----",             status: "translated" },
  { key: "nav.citizens",        en: "Citizens",               bn: "------",            status: "translated" },
  { key: "nav.supply",          en: "Supply",                 bn: "------",            status: "translated" },
  { key: "nav.fraud",           en: "Fraud",                  bn: undefined,           status: "pending" },
  { key: "nav.broadcast",       en: "Broadcast",              bn: undefined,           status: "pending" },
  { key: "nav.reports",         en: "Reports",                bn: "---------",          status: "translated" },
  { key: "nav.settings",        en: "Settings",               bn: undefined,           status: "pending" },
  { key: "btn.save",            en: "Save",                   bn: "------- ----",      status: "translated" },
  { key: "btn.cancel",          en: "Cancel",                 bn: "-----",             status: "translated" },
  { key: "btn.delete",          en: "Delete",                 bn: undefined,           status: "pending" },
  { key: "btn.edit",            en: "Edit",                   bn: "--------",           status: "translated" },
  { key: "label.name",          en: "Name",                   bn: "---",               status: "translated" },
  { key: "label.email",         en: "Email",                  bn: "-----",             status: "translated" },
  { key: "label.phone",         en: "Phone",                  bn: undefined,           status: "pending" },
  { key: "label.division",      en: "Division",               bn: "-----",             status: "translated" },
  { key: "label.district",      en: "District",               bn: "----",              status: "translated" },
  { key: "msg.success",         en: "Operation successful",   bn: "------- -------",   status: "translated" },
  { key: "msg.error",           en: "An error occurred",      bn: undefined,           status: "pending" },
];

export async function getLocaleStrings(): Promise<ActionResult<LocaleString[]>> {
  return { ok: true, data: LOCALE_STRINGS };
}

export async function updateLocaleString(key: string, bn: string): Promise<ActionResult<void>> {
  const session = await requireRole([ROLES.SUPER_ADMIN]);

  const entry = LOCALE_STRINGS.find((s) => s.key === key);
  if (!entry) return { ok: false, error: "String key not found" };

  const old = entry.bn;
  entry.bn     = bn;
  entry.status = "translated";

  await auditLog(session.user.id, session.user.name, "localization", key, old, bn);
  return { ok: true, data: undefined };
}

/* -------------------------------------------------------------------------------
   SETTINGS AUDIT TRAIL
------------------------------------------------------------------------------- */
export interface SettingsAuditRow {
  _id:          string;
  adminName:    string;
  section:      string;
  key:          string;
  oldValue:     string;
  newValue:     string;
  irreversible: boolean;
  createdAt:    string;
}

export async function getSettingsAuditTrail(page = 1, limit = 50): Promise<ActionResult<{
  data: SettingsAuditRow[]; total: number; pages: number;
}>> {
  await requireRole([ROLES.SUPER_ADMIN]);
  await connectDB();

  const [docs, total] = await Promise.all([
    SettingsAudit.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SettingsAudit.countDocuments(),
  ]);

  return {
    ok: true,
    data: {
      total,
      pages: Math.ceil(total / limit),
      data: docs.map((d) => ({
        _id:          String(d._id),
        adminName:    d.adminName,
        section:      d.section,
        key:          d.key,
        oldValue:     JSON.stringify(d.oldValue ?? "-"),
        newValue:     JSON.stringify(d.newValue ?? "-"),
        irreversible: d.irreversible,
        createdAt:    d.createdAt.toISOString(),
      })),
    },
  };
}
