"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { VaccinationRecord } from "@/models/VaccinationRecord";
import { getAdminSession } from "@/lib/getAdminSession";
import {
  SuspendCitizenSchema, VerifyIdentitySchema, MergeAccountsSchema,
  type SuspendCitizenInput, type VerifyIdentityInput, type MergeAccountsInput,
} from "@/lib/schemas/users";
import type { ActionResult } from "./centers";

/* --- Types -------------------------------------------------------------------- */
export interface CitizenSearchParams {
  query?:            string;
  division?:         string;
  vaccinationStatus?: string;
  dateFrom?:         string;
  dateTo?:           string;
  page?:             number;
  limit?:            number;
}

export interface CitizenRow {
  _id:               string;
  userId:            string;
  nid:               string;
  name:              string;
  phone:             string;
  email?:            string;
  division:          string;
  vaccinationStatus: string;
  isVerified:        boolean;
  isSuspended:       boolean;
  createdAt:         string;
}

export interface CitizenProfile extends CitizenRow {
  dateOfBirth: string;
  gender:      string;
  district:    string;
  upazila:     string;
  address?:    string;
  suspendedReason?: string;
  lastLogin?:  string;
}

/* --- searchCitizens ----------------------------------------------------------- */
export async function searchCitizens(params: CitizenSearchParams): Promise<
  ActionResult<{ data: CitizenRow[]; total: number; pages: number }>
> {
  await connectDB();

  const page  = params.page  ?? 1;
  const limit = params.limit ?? 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};

  if (params.query) {
    const q = params.query.trim();
    filter.$or = [
      { name:  { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { nid:   { $regex: q, $options: "i" } },
    ];
  }
  if (params.division)          filter["address.division"]  = params.division;
  if (params.vaccinationStatus) filter.vaccinationStatus     = params.vaccinationStatus;
  if (params.dateFrom || params.dateTo) {
    filter.createdAt = {};
    if (params.dateFrom) filter.createdAt.$gte = new Date(params.dateFrom);
    if (params.dateTo)   filter.createdAt.$lte = new Date(params.dateTo);
  }

  const [docs, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const data: CitizenRow[] = docs.map((u) => ({
    _id:               String(u._id),
    userId:            u.userId,
    nid:               u.nid,
    name:              u.name,
    phone:             u.phone,
    email:             u.email,
    division:          u.address?.division ?? "",
    vaccinationStatus: u.vaccinationStatus,
    isVerified:        u.isVerified,
    isSuspended:       u.isSuspended,
    createdAt:         u.createdAt?.toISOString() ?? "",
  }));

  return { ok: true, data: { data, total, pages: Math.ceil(total / limit) } };
}

/* --- getCitizenProfile -------------------------------------------------------- */
export async function getCitizenProfile(userId: string): Promise<ActionResult<{
  profile:      CitizenProfile;
  vaccinations: object[];
  appointments: object[];
}>> {
  await connectDB();

  const user = await User.findById(userId).lean();
  if (!user) return { ok: false, error: "Citizen not found" };

  const vaccinations = await VaccinationRecord.find({ userId: user._id })
    .populate("vaccineId", "name shortName")
    .populate("centerId",  "name address")
    .populate("staffId",   "name")
    .sort({ administeredAt: -1 })
    .lean();

  const profile: CitizenProfile = {
    _id:               String(user._id),
    userId:            user.userId,
    nid:               user.nid,
    name:              user.name,
    phone:             user.phone,
    email:             user.email,
    dateOfBirth:       user.dateOfBirth?.toISOString() ?? "",
    gender:            user.gender,
    division:          user.address?.division ?? "",
    district:          user.address?.district ?? "",
    upazila:           user.address?.upazila ?? "",
    address:           user.address?.full ?? "",
    vaccinationStatus: user.vaccinationStatus,
    isVerified:        user.isVerified,
    isSuspended:       user.isSuspended,
    suspendedReason:   user.suspendedReason,
    createdAt:         user.createdAt.toISOString(),
  };

  return {
    ok: true,
    data: {
      profile,
      vaccinations: vaccinations.map((v) => ({ ...v, _id: String(v._id) })),
      appointments: [], // extend when Appointment model exists
    },
  };
}

/* --- verifyIdentity ----------------------------------------------------------- */
export async function verifyIdentity(
  userId: string,
  raw: VerifyIdentityInput
): Promise<ActionResult<void>> {
  const parsed = VerifyIdentitySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };

  const session = await getAdminSession();
  await connectDB();

  const user = await User.findById(userId);
  if (!user) return { ok: false, error: "Citizen not found" };

  user.isVerified = parsed.data.status === "VERIFIED";
  await user.save();

  console.info("[AUDIT] verifyIdentity", {
    adminId:   session.user.id,
    userId,
    status:    parsed.data.status,
    reason:    parsed.data.reason,
    timestamp: new Date().toISOString(),
  });

  revalidatePath("/users");
  return { ok: true, data: undefined };
}

/* --- suspendAccount ----------------------------------------------------------- */
export async function suspendAccount(
  userId: string,
  raw: SuspendCitizenInput
): Promise<ActionResult<void>> {
  const parsed = SuspendCitizenSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };

  const session = await getAdminSession();
  await connectDB();

  const user = await User.findById(userId);
  if (!user) return { ok: false, error: "Citizen not found" };

  user.isSuspended     = true;
  user.suspendedReason = `${parsed.data.reason}: ${parsed.data.note}`;
  await user.save();

  console.info("[AUDIT] suspendAccount", {
    adminId:   session.user.id,
    userId,
    reason:    parsed.data.reason,
    duration:  parsed.data.durationType,
    timestamp: new Date().toISOString(),
  });

  revalidatePath("/users");
  return { ok: true, data: undefined };
}

/* --- reactivateAccount -------------------------------------------------------- */
export async function reactivateAccount(userId: string): Promise<ActionResult<void>> {
  const session = await getAdminSession();
  await connectDB();

  const user = await User.findById(userId);
  if (!user) return { ok: false, error: "Citizen not found" };

  user.isSuspended     = false;
  user.suspendedReason = undefined;
  await user.save();

  console.info("[AUDIT] reactivateAccount", {
    adminId: session.user.id, userId, timestamp: new Date().toISOString(),
  });

  revalidatePath("/users");
  return { ok: true, data: undefined };
}

/* --- mergeAccounts ------------------------------------------------------------ */
export async function mergeAccounts(raw: MergeAccountsInput): Promise<ActionResult<void>> {
  const parsed = MergeAccountsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };

  const session = await getAdminSession();
  await connectDB();

  const [primary, secondary] = await Promise.all([
    User.findById(parsed.data.primaryId),
    User.findById(parsed.data.secondaryId),
  ]);
  if (!primary || !secondary) return { ok: false, error: "One or both accounts not found" };

  if (parsed.data.action === "MERGE") {
    // Transfer vaccination records to primary
    await VaccinationRecord.updateMany(
      { userId: secondary._id },
      { $set: { userId: primary._id } }
    );
    secondary.isSuspended     = true;
    secondary.suspendedReason = `MERGED into ${primary.userId} by admin ${session.user.id}`;
    await secondary.save();
  } else if (parsed.data.action === "BLOCK_BOTH") {
    primary.isSuspended     = true;
    secondary.isSuspended   = true;
    primary.suspendedReason = secondary.suspendedReason = `FRAUD_CONFIRMED: ${parsed.data.note}`;
    await Promise.all([primary.save(), secondary.save()]);
  }
  // DISTINCT: just log, no DB change

  console.info("[AUDIT] mergeAccounts", {
    adminId:     session.user.id,
    primaryId:   parsed.data.primaryId,
    secondaryId: parsed.data.secondaryId,
    action:      parsed.data.action,
    note:        parsed.data.note,
    timestamp:   new Date().toISOString(),
  });

  revalidatePath("/users");
  return { ok: true, data: undefined };
}

/* --- generateDataExport ------------------------------------------------------- */
export async function generateDataExport(userId: string): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  const session = await getAdminSession();
  await connectDB();

  const user = await User.findById(userId).lean();
  if (!user) return { ok: false, error: "Citizen not found" };

  // Generate a signed token (in production: store in DB with expiry)
  const token     = Buffer.from(JSON.stringify({ userId, adminId: session.user.id, exp: Date.now() + 86_400_000 })).toString("base64url");
  const expiresAt = new Date(Date.now() + 86_400_000).toISOString();

  console.info("[AUDIT] GDPR_EXPORT", {
    adminId: session.user.id, userId, token, timestamp: new Date().toISOString(),
  });

  return { ok: true, data: { token, expiresAt } };
}
