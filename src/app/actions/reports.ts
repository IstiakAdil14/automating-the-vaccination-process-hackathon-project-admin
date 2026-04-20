"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import { ReportLog, ScheduledReport, REPORT_STATUS } from "@/models/ReportLog";
import { getAdminSession } from "@/lib/getAdminSession";
import { generateCustomReport, generatePublicDataset, type ReportConfig } from "@/lib/reports/reportGenerators";
import { createSchedule } from "@/lib/reports/reportScheduler";
import type { ActionResult } from "./centers";

/* --- Types -------------------------------------------------------------------- */
export interface ReportHistoryRow {
  _id:         string;
  reportId:    string;
  type:        string;
  title:       string;
  format:      string;
  status:      string;
  fileUrl?:    string;
  fileSize?:   number;
  errorMsg?:   string;
  createdAt:   string;
}

export interface ScheduledReportRow {
  _id:         string;
  scheduleId:  string;
  templateKey: string;
  title:       string;
  frequency:   string;
  recipients:  string[];
  isActive:    boolean;
  lastRunAt?:  string;
  nextRunAt?:  string;
  createdAt:   string;
}

export interface GenerateReportInput {
  type:       string;
  title:      string;
  format:     "PDF" | "CSV" | "XLSX" | "JSON";
  dateFrom?:  string;
  dateTo?:    string;
  divisions?: string[];
  metrics?:   string[];
}

/* --- generateReport ----------------------------------------------------------- */
export async function generateReport(
  input: GenerateReportInput
): Promise<ActionResult<{ reportId: string; base64: string; mimeType: string; filename: string }>> {
  const session = await getAdminSession();
  await connectDB();

  const reportId = `RPT-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;

  const log = await ReportLog.create({
    reportId,
    type:        input.type,
    title:       input.title,
    format:      input.format,
    status:      REPORT_STATUS.GENERATING,
    generatedBy: session.user.id,
    config:      input,
  });

  try {
    const config: ReportConfig = {
      ...input,
      adminName: session.user.name,
    };

    const buffer = await generateCustomReport(config);

    const mimeTypes: Record<string, string> = {
      PDF:  "application/pdf",
      CSV:  "text/csv",
      XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      JSON: "application/json",
    };

    const extensions: Record<string, string> = { PDF: "pdf", CSV: "csv", XLSX: "xlsx", JSON: "json" };

    log.status   = REPORT_STATUS.READY;
    log.fileSize = buffer.length;
    await log.save();

    console.info("[AUDIT] generateReport", {
      adminId: session.user.id, reportId, type: input.type, format: input.format,
      ts: new Date().toISOString(),
    });

    revalidatePath("/reports");

    return {
      ok: true,
      data: {
        reportId,
        base64:   buffer.toString("base64"),
        mimeType: mimeTypes[input.format] ?? "application/octet-stream",
        filename: `${reportId}-${input.type.toLowerCase()}.${extensions[input.format] ?? "bin"}`,
      },
    };
  } catch (e) {
    log.status   = REPORT_STATUS.FAILED;
    log.errorMsg = String(e);
    await log.save();
    return { ok: false, error: `Report generation failed: ${String(e)}` };
  }
}

/* --- generatePublicExport ----------------------------------------------------- */
export async function generatePublicExport(): Promise<ActionResult<{ base64: string; filename: string }>> {
  const session = await getAdminSession();

  const buffer = await generatePublicDataset();

  console.info("[AUDIT] generatePublicExport", { adminId: session.user.id, ts: new Date().toISOString() });

  return {
    ok: true,
    data: {
      base64:   buffer.toString("base64"),
      filename: `public-dataset-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  };
}

/* --- scheduleReport ----------------------------------------------------------- */
export async function scheduleReport(input: {
  templateKey: string;
  title:       string;
  frequency:   "DAILY" | "WEEKLY" | "MONTHLY";
  recipients:  string[];
}): Promise<ActionResult<{ scheduleId: string }>> {
  const session = await getAdminSession();

  if (input.recipients.length === 0) {
    return { ok: false, error: "At least one recipient email is required" };
  }

  const scheduleId = await createSchedule({
    templateKey: input.templateKey,
    title:       input.title,
    frequency:   input.frequency,
    recipients:  input.recipients,
    createdBy:   session.user.id,
  });

  console.info("[AUDIT] scheduleReport", { adminId: session.user.id, scheduleId, ts: new Date().toISOString() });

  revalidatePath("/reports");
  return { ok: true, data: { scheduleId } };
}

/* --- toggleSchedule ----------------------------------------------------------- */
export async function toggleSchedule(scheduleId: string, isActive: boolean): Promise<ActionResult<void>> {
  await connectDB();
  await ScheduledReport.findOneAndUpdate({ scheduleId }, { isActive });
  revalidatePath("/reports");
  return { ok: true, data: undefined };
}

/* --- deleteSchedule ----------------------------------------------------------- */
export async function deleteSchedule(scheduleId: string): Promise<ActionResult<void>> {
  await connectDB();
  await ScheduledReport.findOneAndDelete({ scheduleId });
  revalidatePath("/reports");
  return { ok: true, data: undefined };
}

/* --- getScheduledReports ------------------------------------------------------ */
export async function getScheduledReports(): Promise<ActionResult<ScheduledReportRow[]>> {
  await connectDB();

  const docs = await ScheduledReport.find().sort({ createdAt: -1 }).lean();

  return {
    ok: true,
    data: docs.map((d) => ({
      _id:         String(d._id),
      scheduleId:  d.scheduleId,
      templateKey: d.templateKey,
      title:       d.title,
      frequency:   d.frequency,
      recipients:  d.recipients,
      isActive:    d.isActive,
      lastRunAt:   d.lastRunAt?.toISOString(),
      nextRunAt:   d.nextRunAt?.toISOString(),
      createdAt:   d.createdAt.toISOString(),
    })),
  };
}

/* --- getReportHistory --------------------------------------------------------- */
export async function getReportHistory(page = 1, limit = 20): Promise<ActionResult<{
  data: ReportHistoryRow[]; total: number; pages: number;
}>> {
  await connectDB();

  const [docs, total] = await Promise.all([
    ReportLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ReportLog.countDocuments(),
  ]);

  return {
    ok: true,
    data: {
      total,
      pages: Math.ceil(total / limit),
      data: docs.map((d) => ({
        _id:       String(d._id),
        reportId:  d.reportId,
        type:      d.type,
        title:     d.title,
        format:    d.format,
        status:    d.status,
        fileUrl:   d.fileUrl,
        fileSize:  d.fileSize,
        errorMsg:  d.errorMsg,
        createdAt: d.createdAt.toISOString(),
      })),
    },
  };
}
