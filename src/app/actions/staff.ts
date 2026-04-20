"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import { Staff } from "@/models/Staff";
import { Center } from "@/models/Center";
import { StaffRequest, REQUEST_STATUS } from "@/models/StaffRequest";
import {
  CreateStaffSchema, StaffSuspendSchema, AssignStaffSchema,
  RequestReviewSchema, BulkImportRowSchema,
  type CreateStaffInput, type StaffSuspendInput,
  type AssignStaffInput, type RequestReviewInput, type BulkImportRow,
} from "@/lib/schemas/staff";
import { sendEmail } from "@/lib/mailer";
import { AccountCreationEmail } from "@/emails/AccountCreationEmail";
import { SuspensionEmail } from "@/emails/SuspensionEmail";
import { TransferEmail } from "@/emails/TransferEmail";
import type { ActionResult } from "./centers";

/* --- Helpers ------------------------------------------------------------------ */
function generateStaffId(): string {
  return `STF-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function generateTempPassword(): string {
  return randomBytes(8).toString("base64url").slice(0, 12);
}

/* --- createStaff -------------------------------------------------------------- */
export async function createStaff(
  raw: CreateStaffInput
): Promise<ActionResult<{ staffId: string }>> {
  const parsed = CreateStaffSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };

  await connectDB();

  const exists = await Staff.findOne({ $or: [{ nid: parsed.data.nid }, { email: parsed.data.email }] });
  if (exists) return { ok: false, error: "Staff with this NID or email already exists" };

  const center = await Center.findById(parsed.data.centerId).lean();
  if (!center) return { ok: false, error: "Center not found" };

  const tempPassword = generateTempPassword();
  const staffId      = generateStaffId();

  const staff = await Staff.create({
    staffId,
    nid:            parsed.data.nid,
    name:           parsed.data.name,
    phone:          parsed.data.phone,
    email:          parsed.data.email,
    role:           parsed.data.role,
    centerId:       parsed.data.centerId,
    hashedPassword: tempPassword,   /* pre-save hook hashes this */
    isActive:       true,
    isSuspended:    false,
  });

  if (parsed.data.sendCredentials) {
    await sendEmail({
      to:       parsed.data.email,
      subject:  "Your VaxAdmin Staff Account",
      template: AccountCreationEmail({
        staffName:    parsed.data.name,
        email:        parsed.data.email,
        tempPassword,
        centerName:   center.name,
        role:         parsed.data.role,
        loginUrl:     `${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/login`,
      }),
    }).catch(() => { /* non-fatal */ });
  }

  revalidatePath("/staff");
  return { ok: true, data: { staffId: staff.staffId } };
}

/* --- assignStaff -------------------------------------------------------------- */
export async function assignStaff(
  staffMongoId: string,
  raw: AssignStaffInput
): Promise<ActionResult<void>> {
  const parsed = AssignStaffSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };

  await connectDB();
  const staff = await Staff.findById(staffMongoId);
  if (!staff) return { ok: false, error: "Staff not found" };

  const [oldCenter, newCenter] = await Promise.all([
    Center.findById(staff.centerId).lean(),
    Center.findById(parsed.data.centerId).lean(),
  ]);
  if (!newCenter) return { ok: false, error: "Target center not found" };

  staff.centerId = parsed.data.centerId as unknown as typeof staff.centerId;
  await staff.save();

  /* Send transfer email */
  await sendEmail({
    to:       staff.email,
    subject:  "Your VaxAdmin Assignment Has Been Updated",
    template: TransferEmail({
      staffName:      staff.name,
      fromCenterName: oldCenter?.name ?? "Previous Center",
      toCenterName:   newCenter.name,
      newRole:        staff.role,
      effectiveDate:  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    }),
  }).catch(() => {});

  revalidatePath("/staff");
  return { ok: true, data: undefined };
}

/* --- suspendStaff ------------------------------------------------------------- */
export async function suspendStaff(
  staffMongoId: string,
  raw: StaffSuspendInput
): Promise<ActionResult<void>> {
  const parsed = StaffSuspendSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };

  await connectDB();
  const staff = await Staff.findById(staffMongoId);
  if (!staff) return { ok: false, error: "Staff not found" };

  staff.isSuspended      = true;
  staff.isActive         = false;
  staff.suspendedReason  = parsed.data.reason;
  await staff.save();

  await sendEmail({
    to:       staff.email,
    subject:  "Important: Your VaxAdmin Account Has Been Suspended",
    template: SuspensionEmail({
      staffName:    staff.name,
      reason:       parsed.data.reason,
      suspendUntil: parsed.data.durationType === "temporary" ? (parsed.data.suspendUntil ?? null) : null,
      contactEmail: process.env.ADMIN_CONTACT_EMAIL ?? "admin@vax.gov.bd",
    }),
  }).catch(() => {});

  revalidatePath("/staff");
  return { ok: true, data: undefined };
}

/* --- reactivateStaff ---------------------------------------------------------- */
export async function reactivateStaff(staffMongoId: string): Promise<ActionResult<void>> {
  await connectDB();
  const staff = await Staff.findById(staffMongoId);
  if (!staff) return { ok: false, error: "Staff not found" };

  staff.isSuspended     = false;
  staff.isActive        = true;
  staff.suspendedReason = undefined;
  await staff.save();

  revalidatePath("/staff");
  return { ok: true, data: undefined };
}

/* --- approveRequest ----------------------------------------------------------- */
export async function approveRequest(
  requestId: string,
  raw: RequestReviewInput,
  reviewerId: string
): Promise<ActionResult<void>> {
  const parsed = RequestReviewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };

  await connectDB();
  const req = await StaffRequest.findById(requestId).populate("centerId").populate("staffId");
  if (!req) return { ok: false, error: "Request not found" };

  req.status     = parsed.data.action === "approve" ? REQUEST_STATUS.APPROVED : REQUEST_STATUS.DENIED;
  req.reviewedBy = reviewerId as unknown as typeof req.reviewedBy;
  req.reviewedAt = new Date();
  if (parsed.data.action === "deny") req.reviewNote = parsed.data.reason;
  await req.save();

  revalidatePath("/staff");
  return { ok: true, data: undefined };
}

/* --- bulkImport --------------------------------------------------------------- */
export interface BulkImportResult {
  total:    number;
  created:  number;
  failed:   number;
  errors:   { row: number; field: string; message: string }[];
}

export async function bulkImport(rows: BulkImportRow[]): Promise<ActionResult<BulkImportResult>> {
  await connectDB();

  const result: BulkImportResult = { total: rows.length, created: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const parsed = BulkImportRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.failed++;
      parsed.error.errors.forEach((e) => {
        result.errors.push({ row: i + 1, field: e.path.join("."), message: e.message });
      });
      continue;
    }

    try {
      const exists = await Staff.findOne({
        $or: [{ nid: parsed.data.nid }, { email: parsed.data.email }],
      });
      if (exists) {
        result.failed++;
        result.errors.push({ row: i + 1, field: "nid/email", message: "Duplicate NID or email" });
        continue;
      }

      const tempPassword = generateTempPassword();
      await Staff.create({
        staffId:        generateStaffId(),
        nid:            parsed.data.nid,
        name:           parsed.data.name,
        phone:          parsed.data.phone,
        email:          parsed.data.email,
        role:           parsed.data.role,
        centerId:       parsed.data.centerId,
        hashedPassword: tempPassword,
        isActive:       true,
        isSuspended:    false,
      });
      result.created++;
    } catch {
      result.failed++;
      result.errors.push({ row: i + 1, field: "general", message: "Database error" });
    }
  }

  revalidatePath("/staff");
  return { ok: true, data: result };
}
