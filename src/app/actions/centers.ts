"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { Center, CENTER_STATUS } from "@/models/Center";
import { CenterEditSchema, ApplicationReviewSchema, SuspendSchema } from "@/lib/schemas/center";
import type { CenterEditInput, ApplicationReviewInput, SuspendInput } from "@/lib/schemas/center";

export type ActionResult<T = void> =
  | { ok: true;  data: T }
  | { ok: false; error: string };

/* --- updateCenter ------------------------------------------------------------- */
export async function updateCenter(
  id: string,
  raw: CenterEditInput
): Promise<ActionResult<{ updatedAt: string }>> {
  const parsed = CenterEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  await connectDB();
  const center = await Center.findById(id);
  if (!center) return { ok: false, error: "Center not found" };

  Object.assign(center, parsed.data);
  await center.save();

  revalidatePath("/centers");
  return { ok: true, data: { updatedAt: center.updatedAt.toISOString() } };
}

/* --- reviewApplication -------------------------------------------------------- */
export async function reviewApplication(
  id: string,
  raw: ApplicationReviewInput
): Promise<ActionResult<{ status: string }>> {
  const parsed = ApplicationReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  await connectDB();
  const center = await Center.findById(id);
  if (!center) return { ok: false, error: "Center not found" };
  if (center.status !== CENTER_STATUS.PENDING) {
    return { ok: false, error: "Center is not in PENDING status" };
  }

  if (parsed.data.action === "approve") {
    center.status     = CENTER_STATUS.ACTIVE;
    center.approvedAt = new Date();
  } else {
    center.status           = CENTER_STATUS.SUSPENDED;
    center.suspendedReason  = parsed.data.reason;
  }

  await center.save();
  revalidatePath("/centers");
  return { ok: true, data: { status: center.status } };
}

/* --- suspendCenter ------------------------------------------------------------ */
export async function suspendCenter(
  id: string,
  raw: SuspendInput
): Promise<ActionResult<{ status: string }>> {
  const parsed = SuspendSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };
  }

  await connectDB();
  const center = await Center.findById(id);
  if (!center) return { ok: false, error: "Center not found" };

  center.status          = CENTER_STATUS.SUSPENDED;
  center.suspendedReason = parsed.data.reason;
  await center.save();

  revalidatePath("/centers");
  return { ok: true, data: { status: center.status } };
}

/* --- reactivateCenter --------------------------------------------------------- */
export async function reactivateCenter(
  id: string
): Promise<ActionResult<{ status: string }>> {
  await connectDB();
  const center = await Center.findById(id);
  if (!center) return { ok: false, error: "Center not found" };

  center.status          = CENTER_STATUS.ACTIVE;
  center.suspendedReason = undefined;
  await center.save();

  revalidatePath("/centers");
  return { ok: true, data: { status: center.status } };
}
