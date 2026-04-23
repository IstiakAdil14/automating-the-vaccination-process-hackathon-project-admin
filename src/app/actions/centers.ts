"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { Center, CENTER_STATUS } from "@/models/Center";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { CenterEditSchema, ApplicationReviewSchema, SuspendSchema } from "@/lib/schemas/center";
import type { CenterEditInput, ApplicationReviewInput, SuspendInput } from "@/lib/schemas/center";

export type ActionResult<T = void> =
  | { ok: true;  data: T }
  | { ok: false; error: string };

// Loose model for center_applications
const AppSchema = new mongoose.Schema({}, { strict: false, collection: "center_applications", timestamps: true });
const CenterApp = (mongoose.models.CenterApp as mongoose.Model<mongoose.Document>) ??
  mongoose.model("CenterApp", AppSchema);

async function sendReviewEmail(to: string, name: string, centerName: string, approved: boolean, reason?: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  const subject = approved
    ? `✅ Your Center Application Approved — VaccinationBD`
    : `❌ Your Center Application Declined — VaccinationBD`;
  const html = approved
    ? `<div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#0d9488">Application Approved 🎉</h2>
        <p>Dear ${name},</p>
        <p>We are pleased to inform you that <strong>${centerName}</strong> has been <strong>approved</strong> and is now active on the VaccinationBD platform.</p>
        <p>You can now log in to the Vaccination Centers portal to manage your center.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="color:#64748b;font-size:13px">VaccinationBD — Government of Bangladesh</p>
      </div>`
    : `<div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#ef4444">Application Declined</h2>
        <p>Dear ${name},</p>
        <p>Unfortunately, the application for <strong>${centerName}</strong> has been <strong>declined</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        <p>If you believe this is an error, please contact the VaccinationBD support team.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="color:#64748b;font-size:13px">VaccinationBD — Government of Bangladesh</p>
      </div>`;
  await transporter.sendMail({
    from: `"VaccinationBD" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

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

  // Try center_applications first (new flow)
  const app = await CenterApp.findById(id).lean() as Record<string, unknown> | null;
  if (app) {
    const email = app.email as string;
    const contactName = app.contactName as string;
    const centerName = app.centerName as string;

    if (parsed.data.action === "approve") {
      const upazila = (app.upazila ?? app.localBodyName ?? "") as string;
      await Center.create({
        centerId:      app.referenceNumber,
        name:          app.centerName,
        licenseNo:     app.licenseNumber,
        type:          "GOVT_HOSPITAL",
        geoLat:        app.geoLat ?? 0,
        geoLng:        app.geoLng ?? 0,
        address: {
          division: app.division,
          district: app.district,
          upazila,
          full:     app.address,
        },
        contact: {
          name:  app.contactName,
          phone: app.phone,
          email: app.email,
        },
        status:        CENTER_STATUS.ACTIVE,
        dailyCapacity: app.capacity ?? 100,
        approvedAt:    new Date(),
        totalVaccinations: 0,
      });
      await CenterApp.findByIdAndUpdate(id, { status: "approved" });
      sendReviewEmail(email, contactName, centerName, true).catch(() => {});
    } else {
      await CenterApp.findByIdAndUpdate(id, { status: "rejected", rejectionReason: parsed.data.reason });
      sendReviewEmail(email, contactName, centerName, false, parsed.data.reason).catch(() => {});
    }
    revalidatePath("/centers");
    return { ok: true, data: { status: parsed.data.action === "approve" ? "ACTIVE" : "SUSPENDED" } };
  }

  // Fallback: legacy Center doc
  const center = await Center.findById(id);
  if (!center) return { ok: false, error: "Application not found" };
  if (center.status !== CENTER_STATUS.PENDING) {
    return { ok: false, error: "Center is not in PENDING status" };
  }
  if (parsed.data.action === "approve") {
    center.status     = CENTER_STATUS.ACTIVE;
    center.approvedAt = new Date();
  } else {
    center.status          = CENTER_STATUS.SUSPENDED;
    center.suspendedReason = parsed.data.reason;
  }
  await center.save();
  if (center.contact.email) {
    sendReviewEmail(
      center.contact.email,
      center.contact.name,
      center.name,
      parsed.data.action === "approve",
      parsed.data.action === "reject" ? parsed.data.reason : undefined
    ).catch(() => {});
  }
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
