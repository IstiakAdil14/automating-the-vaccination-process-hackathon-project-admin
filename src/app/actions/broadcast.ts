"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import { Broadcast, BROADCAST_STATUS } from "@/models/Broadcast";
import { User } from "@/models/User";
import { Staff } from "@/models/Staff";
import { getAdminSession } from "@/lib/getAdminSession";
import {
  sendViaSMS, sendViaEmail, sendInApp, queueLargeBroadcast,
  type SMSRecipient, type EmailRecipient,
} from "@/lib/notifications/broadcastService";
import type { ActionResult } from "./centers";

/* --- Types -------------------------------------------------------------------- */
export interface BroadcastAudience {
  roles:              string[];   // "CITIZEN" | "STAFF" | "ADMIN"
  divisions:          string[];
  districts:          string[];
  vaccinationStatus?: string;
  ageMin?:            number;
  ageMax?:            number;
  gender?:            string;
}

export interface BroadcastPayload {
  title:         string;
  channels:      string[];   // "SMS" | "EMAIL" | "IN_APP"
  smsBody?:      string;
  emailSubject?: string;
  emailHtml?:    string;
  inAppBody?:    string;
  audience:      BroadcastAudience;
}

export interface BroadcastHistoryRow {
  _id:          string;
  broadcastId:  string;
  title:        string;
  channels:     string[];
  audienceSummary: string;
  status:       string;
  sentAt?:      string;
  scheduledAt?: string;
  estimatedRecipients: number;
  deliveryStats: {
    sms:   { sent: number; delivered: number; failed: number };
    email: { sent: number; delivered: number; failed: number; opened: number };
    inApp: { sent: number; delivered: number; failed: number };
  };
  createdAt: string;
}

export interface DeliveryReportData {
  broadcastId:  string;
  title:        string;
  sentAt?:      string;
  channels:     string[];
  totalSent:    number;
  totalDelivered: number;
  totalFailed:  number;
  sms:   { sent: number; delivered: number; failed: number; bounceRate: number };
  email: { sent: number; delivered: number; failed: number; openRate: number };
  inApp: { sent: number; delivered: number; failed: number };
  failureReasons: { reason: string; count: number }[];
}

/* --- Helpers ------------------------------------------------------------------ */
function generateBroadcastId(): string {
  return `BC-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function audienceSummary(audience: BroadcastAudience): string {
  const parts: string[] = [];
  if (audience.roles.length)     parts.push(audience.roles.join(", "));
  if (audience.divisions.length) parts.push(audience.divisions.join(", "));
  if (audience.vaccinationStatus) parts.push(audience.vaccinationStatus);
  return parts.join(" - ") || "All users";
}

async function resolveRecipients(audience: BroadcastAudience, channels: string[]): Promise<{
  smsRecipients:   SMSRecipient[];
  emailRecipients: EmailRecipient[];
  inAppUserIds:    string[];
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userFilter: Record<string, any> = {};
  if (audience.divisions.length)    userFilter["address.division"] = { $in: audience.divisions };
  if (audience.vaccinationStatus)   userFilter.vaccinationStatus   = audience.vaccinationStatus;
  if (audience.gender)              userFilter.gender               = audience.gender;

  const includesCitizens = audience.roles.length === 0 || audience.roles.includes("CITIZEN");
  const includesStaff    = audience.roles.includes("STAFF");

  const [citizens, staff] = await Promise.all([
    includesCitizens ? User.find(userFilter, "phone email _id").lean() : Promise.resolve([]),
    includesStaff    ? Staff.find({}, "phone email _id").lean()        : Promise.resolve([]),
  ]);

  const smsRecipients:   SMSRecipient[]   = [];
  const emailRecipients: EmailRecipient[] = [];
  const inAppUserIds:    string[]         = [];

  const allUsers = [...citizens, ...staff];

  for (const u of allUsers) {
    const id = String(u._id);
    if (channels.includes("SMS")    && u.phone) smsRecipients.push({ phone: u.phone, userId: id });
    if (channels.includes("EMAIL")  && u.email) emailRecipients.push({ email: u.email, userId: id });
    if (channels.includes("IN_APP"))             inAppUserIds.push(id);
  }

  return { smsRecipients, emailRecipients, inAppUserIds };
}

/* --- estimateRecipients ------------------------------------------------------- */
export async function estimateRecipients(audience: BroadcastAudience): Promise<ActionResult<{
  citizens: number; staff: number; total: number;
}>> {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userFilter: Record<string, any> = {};
  if (audience.divisions.length)  userFilter["address.division"] = { $in: audience.divisions };
  if (audience.vaccinationStatus) userFilter.vaccinationStatus   = audience.vaccinationStatus;
  if (audience.gender)            userFilter.gender               = audience.gender;

  const includesCitizens = audience.roles.length === 0 || audience.roles.includes("CITIZEN");
  const includesStaff    = audience.roles.includes("STAFF");

  const [citizens, staff] = await Promise.all([
    includesCitizens ? User.countDocuments(userFilter)  : Promise.resolve(0),
    includesStaff    ? Staff.countDocuments({})          : Promise.resolve(0),
  ]);

  return { ok: true, data: { citizens, staff, total: citizens + staff } };
}

/* --- sendBroadcast ------------------------------------------------------------ */
export async function sendBroadcast(payload: BroadcastPayload): Promise<ActionResult<{ broadcastId: string }>> {
  const session = await getAdminSession();
  await connectDB();

  const broadcastId = generateBroadcastId();

  const { smsRecipients, emailRecipients, inAppUserIds } = await resolveRecipients(payload.audience, payload.channels);
  const totalRecipients = Math.max(smsRecipients.length, emailRecipients.length, inAppUserIds.length);

  // Create broadcast record
  const broadcast = await Broadcast.create({
    broadcastId,
    title:         payload.title,
    smsBody:       payload.smsBody,
    emailSubject:  payload.emailSubject,
    emailHtml:     payload.emailHtml,
    inAppBody:     payload.inAppBody,
    channels:      payload.channels,
    audience:      payload.audience,
    status:        BROADCAST_STATUS.SENDING,
    sentBy:        session.user.id,
    estimatedRecipients: totalRecipients,
  });

  // Queue if large
  if (totalRecipients > 10_000) {
    await queueLargeBroadcast(broadcastId, totalRecipients);
    broadcast.status = BROADCAST_STATUS.SCHEDULED;
    await broadcast.save();
    revalidatePath("/broadcast");
    return { ok: true, data: { broadcastId } };
  }

  // Send across channels
  const [smsResult, emailResult, inAppResult] = await Promise.all([
    payload.channels.includes("SMS")    && payload.smsBody
      ? sendViaSMS(smsRecipients, payload.smsBody)
      : Promise.resolve({ sent: 0, delivered: 0, failed: 0, opened: 0, errors: [] }),
    payload.channels.includes("EMAIL")  && payload.emailHtml && payload.emailSubject
      ? sendViaEmail(emailRecipients, payload.emailSubject, payload.emailHtml)
      : Promise.resolve({ sent: 0, delivered: 0, failed: 0, opened: 0, errors: [] }),
    payload.channels.includes("IN_APP") && payload.inAppBody
      ? sendInApp(inAppUserIds, { title: payload.title, body: payload.inAppBody, createdBy: session.user.id })
      : Promise.resolve({ sent: 0, delivered: 0, failed: 0, opened: 0, errors: [] }),
  ]);

  // Aggregate failure reasons
  const failureMap: Record<string, number> = {};
  [...smsResult.errors, ...emailResult.errors, ...inAppResult.errors].forEach(({ reason }) => {
    failureMap[reason] = (failureMap[reason] ?? 0) + 1;
  });

  broadcast.status  = BROADCAST_STATUS.SENT;
  broadcast.sentAt  = new Date();
  broadcast.deliveryStats = {
    sms:   { sent: smsResult.sent,   delivered: smsResult.delivered,   failed: smsResult.failed },
    email: { sent: emailResult.sent, delivered: emailResult.delivered, failed: emailResult.failed, opened: 0 },
    inApp: { sent: inAppResult.sent, delivered: inAppResult.delivered, failed: inAppResult.failed },
  };
  broadcast.failureReasons = Object.entries(failureMap).map(([reason, count]) => ({ reason, count }));
  await broadcast.save();

  console.info("[AUDIT] sendBroadcast", { adminId: session.user.id, broadcastId, totalRecipients, ts: new Date().toISOString() });

  revalidatePath("/broadcast");
  return { ok: true, data: { broadcastId } };
}

/* --- scheduleBroadcast -------------------------------------------------------- */
export async function scheduleBroadcast(
  payload: BroadcastPayload,
  schedule: { sendAt: string; recurring?: "DAILY" | "WEEKLY"; weekDays?: number[] }
): Promise<ActionResult<{ broadcastId: string }>> {
  const session = await getAdminSession();
  await connectDB();

  const sendAt = new Date(schedule.sendAt);
  if (sendAt <= new Date(Date.now() + 14 * 60 * 1000)) {
    return { ok: false, error: "Scheduled time must be at least 15 minutes from now" };
  }

  const broadcastId = generateBroadcastId();
  const est = await estimateRecipients(payload.audience);

  await Broadcast.create({
    broadcastId,
    title:         payload.title,
    smsBody:       payload.smsBody,
    emailSubject:  payload.emailSubject,
    emailHtml:     payload.emailHtml,
    inAppBody:     payload.inAppBody,
    channels:      payload.channels,
    audience:      payload.audience,
    schedule:      { sendAt, recurring: schedule.recurring, weekDays: schedule.weekDays },
    status:        BROADCAST_STATUS.SCHEDULED,
    sentBy:        session.user.id,
    estimatedRecipients: est.ok ? est.data.total : 0,
  });

  console.info("[AUDIT] scheduleBroadcast", { adminId: session.user.id, broadcastId, sendAt: schedule.sendAt, ts: new Date().toISOString() });

  revalidatePath("/broadcast");
  return { ok: true, data: { broadcastId } };
}

/* --- getBroadcastHistory ------------------------------------------------------ */
export async function getBroadcastHistory(page = 1, limit = 20): Promise<ActionResult<{
  data: BroadcastHistoryRow[]; total: number; pages: number;
}>> {
  await connectDB();

  const [docs, total] = await Promise.all([
    Broadcast.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Broadcast.countDocuments(),
  ]);

  const data: BroadcastHistoryRow[] = docs.map((d) => ({
    _id:          String(d._id),
    broadcastId:  d.broadcastId,
    title:        d.title,
    channels:     d.channels,
    audienceSummary: audienceSummary(d.audience),
    status:       d.status,
    sentAt:       d.sentAt?.toISOString(),
    scheduledAt:  d.schedule?.sendAt?.toISOString(),
    estimatedRecipients: d.estimatedRecipients,
    deliveryStats: {
      sms:   d.deliveryStats?.sms   ?? { sent: 0, delivered: 0, failed: 0 },
      email: d.deliveryStats?.email ?? { sent: 0, delivered: 0, failed: 0, opened: 0 },
      inApp: d.deliveryStats?.inApp ?? { sent: 0, delivered: 0, failed: 0 },
    },
    createdAt: d.createdAt.toISOString(),
  }));

  return { ok: true, data: { data, total, pages: Math.ceil(total / limit) } };
}

/* --- getDeliveryReport -------------------------------------------------------- */
export async function getDeliveryReport(broadcastId: string): Promise<ActionResult<DeliveryReportData>> {
  await connectDB();

  const doc = await Broadcast.findOne({ broadcastId }).lean();
  if (!doc) return { ok: false, error: "Broadcast not found" };

  const sms   = doc.deliveryStats?.sms   ?? { sent: 0, delivered: 0, failed: 0 };
  const email = doc.deliveryStats?.email ?? { sent: 0, delivered: 0, failed: 0, opened: 0 };
  const inApp = doc.deliveryStats?.inApp ?? { sent: 0, delivered: 0, failed: 0 };

  return {
    ok: true,
    data: {
      broadcastId:    doc.broadcastId,
      title:          doc.title,
      sentAt:         doc.sentAt?.toISOString(),
      channels:       doc.channels,
      totalSent:      sms.sent + email.sent + inApp.sent,
      totalDelivered: sms.delivered + email.delivered + inApp.delivered,
      totalFailed:    sms.failed + email.failed + inApp.failed,
      sms:   { ...sms,   bounceRate: sms.sent   > 0 ? Math.round((sms.failed   / sms.sent)   * 100) : 0 },
      email: { ...email, openRate:   email.sent > 0 ? Math.round((email.opened / email.sent) * 100) : 0 },
      inApp,
      failureReasons: doc.failureReasons ?? [],
    },
  };
}
