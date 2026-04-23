import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CenterApplication } from "@/models/CenterApplication";
import { Center } from "@/models/Center";
import { auth } from "@/lib/auth";
import nodemailer from "nodemailer";
import mongoose from "mongoose";

type Params = { params: Promise<{ id: string }> };

async function sendStatusEmail(email: string, name: string, ref: string, approved: boolean, reason?: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: `"VaccinationBD" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: approved ? "Center Registration Approved — VaccinationBD" : "Center Registration Update — VaccinationBD",
    html: approved
      ? `<div style="font-family:sans-serif;max-width:560px;margin:auto">
           <h2 style="color:#0d9488">Application Approved ✓</h2>
           <p>Dear ${name},</p>
           <p>Your vaccination center registration (<strong>${ref}</strong>) has been <strong>approved</strong>.</p>
           <p>You can now log in to the center portal using your registered email and password.</p>
           <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
           <p style="color:#64748b;font-size:13px">VaccinationBD — Government of Bangladesh</p>
         </div>`
      : `<div style="font-family:sans-serif;max-width:560px;margin:auto">
           <h2 style="color:#ef4444">Application Not Approved</h2>
           <p>Dear ${name},</p>
           <p>Your vaccination center registration (<strong>${ref}</strong>) could not be approved at this time.</p>
           ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
           <p>Please contact support if you have questions.</p>
           <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
           <p style="color:#64748b;font-size:13px">VaccinationBD — Government of Bangladesh</p>
         </div>`,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, reason } = await req.json() as { action: "approve" | "reject"; reason?: string };

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  await connectDB();

  // Use raw collection — bypasses all Mongoose schema/select restrictions
  const app = await CenterApplication.collection.findOne({
    _id: new mongoose.Types.ObjectId(id),
  });

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.status !== "pending_review") {
    return NextResponse.json({ error: "Application already processed" }, { status: 409 });
  }

  if (action === "reject") {
    await CenterApplication.collection.updateOne(
      { _id: app._id },
      { $set: { status: "rejected", rejectionReason: reason ?? "" } }
    );
    try { await sendStatusEmail(app.email, app.contactName, app.referenceNumber, false, reason); } catch { /* non-fatal */ }
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // Copy entire raw document into centers, just change status and add approvedAt
  const { _id, ...rest } = app;
  await Center.collection.insertOne({
    ...rest,
    status: "approved",
    approvedAt: new Date(),
  });

  await CenterApplication.collection.updateOne(
    { _id: app._id },
    { $set: { status: "approved" } }
  );

  try { await sendStatusEmail(app.email, app.contactName, app.referenceNumber, true); } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, status: "approved" });
}
