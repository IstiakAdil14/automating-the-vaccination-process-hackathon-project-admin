/**
 * broadcastService.ts
 * Handles actual delivery via Twilio (SMS), SendGrid (Email), and MongoDB (In-App).
 * Large broadcasts (>10k recipients) are chunked to avoid rate limits.
 */

import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { randomBytes } from "crypto";

const CHUNK_SIZE = 500;   // recipients per API call
const LARGE_THRESHOLD = 10_000;

/* --- Types -------------------------------------------------------------------- */
export interface SMSRecipient  { phone: string; userId?: string }
export interface EmailRecipient { email: string; name?: string; userId?: string }

export interface DeliveryResult {
  sent:      number;
  delivered: number;
  failed:    number;
  opened:    number;
  errors:    { recipient: string; reason: string }[];
}

/* --- Helpers ------------------------------------------------------------------ */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function generateNotifId(): string {
  return `NOTIF-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

/* --- sendViaSMS --------------------------------------------------------------- */
export async function sendViaSMS(
  recipients: SMSRecipient[],
  message: string
): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, delivered: 0, failed: 0, opened: 0, errors: [] };

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("[broadcastService] Twilio credentials not configured - SMS skipped");
    result.failed = recipients.length;
    result.errors = recipients.map((r) => ({ recipient: r.phone, reason: "Twilio not configured" }));
    return result;
  }

  const isLarge = recipients.length > LARGE_THRESHOLD;
  if (isLarge) {
    console.info(`[broadcastService] Large SMS broadcast (${recipients.length}) - chunking into background`);
  }

  const chunks = chunk(recipients, CHUNK_SIZE);

  for (const batch of chunks) {
    await Promise.allSettled(
      batch.map(async (r) => {
        try {
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                "Content-Type":  "application/x-www-form-urlencoded",
                Authorization:   `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
              },
              body: new URLSearchParams({ To: r.phone, From: fromNumber, Body: message }),
            }
          );
          if (res.ok) { result.sent++; result.delivered++; }
          else {
            const err = await res.json();
            result.failed++;
            result.errors.push({ recipient: r.phone, reason: err.message ?? "Unknown error" });
          }
        } catch (e) {
          result.failed++;
          result.errors.push({ recipient: r.phone, reason: String(e) });
        }
      })
    );
  }

  return result;
}

/* --- sendViaEmail ------------------------------------------------------------- */
export async function sendViaEmail(
  recipients: EmailRecipient[],
  subject: string,
  html: string
): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, delivered: 0, failed: 0, opened: 0, errors: [] };

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn("[broadcastService] SendGrid API key not configured - email skipped");
    result.failed = recipients.length;
    result.errors = recipients.map((r) => ({ recipient: r.email, reason: "SendGrid not configured" }));
    return result;
  }

  const fromEmail = process.env.SMTP_FROM ?? "noreply@vax.gov.bd";
  const chunks    = chunk(recipients, CHUNK_SIZE);

  for (const batch of chunks) {
    try {
      const personalizations = batch.map((r) => ({
        to: [{ email: r.email, name: r.name ?? "" }],
      }));

      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          personalizations,
          from:    { email: fromEmail, name: "VaxAdmin" },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      if (res.status === 202) {
        result.sent      += batch.length;
        result.delivered += batch.length;
      } else {
        const err = await res.json().catch(() => ({}));
        result.failed += batch.length;
        batch.forEach((r) => result.errors.push({ recipient: r.email, reason: JSON.stringify(err) }));
      }
    } catch (e) {
      result.failed += batch.length;
      batch.forEach((r) => result.errors.push({ recipient: r.email, reason: String(e) }));
    }
  }

  return result;
}

/* --- sendInApp ---------------------------------------------------------------- */
export async function sendInApp(
  userIds: string[],
  payload: { title: string; body: string; createdBy: string }
): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, delivered: 0, failed: 0, opened: 0, errors: [] };

  await connectDB();

  const chunks = chunk(userIds, CHUNK_SIZE);

  for (const batch of chunks) {
    try {
      const docs = batch.map((uid) => ({
        notifId:   generateNotifId(),
        createdBy: payload.createdBy,
        title:     payload.title,
        body:      payload.body,
        channels:  ["IN_APP"],
        targetAudience: { roles: [], divisions: [] },
        status:    "SENT",
        sentAt:    new Date(),
        deliveryStats: { sent: 1, delivered: 1, failed: 0, opened: 0 },
        // Store userId in details for per-user lookup
        details:   { userId: uid },
      }));

      await Notification.insertMany(docs, { ordered: false });
      result.sent      += batch.length;
      result.delivered += batch.length;
    } catch (e) {
      result.failed += batch.length;
      batch.forEach((uid) => result.errors.push({ recipient: uid, reason: String(e) }));
    }
  }

  return result;
}

/* --- queueLargeBroadcast ------------------------------------------------------ */
/**
 * For broadcasts >10k recipients, log the job and process asynchronously.
 * In production, replace with a proper queue (BullMQ, SQS, etc.).
 */
export async function queueLargeBroadcast(broadcastId: string, recipientCount: number): Promise<void> {
  console.info("[broadcastService] Queued large broadcast", {
    broadcastId,
    recipientCount,
    queuedAt: new Date().toISOString(),
  });
  // TODO: push to BullMQ / SQS job queue
}
