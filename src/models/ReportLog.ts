import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export const REPORT_STATUS = {
  PENDING:    "PENDING",
  GENERATING: "GENERATING",
  READY:      "READY",
  FAILED:     "FAILED",
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export interface IReportLog extends Document {
  reportId:    string;
  type:        string;   // "WEEKLY_PROGRESS" | "COVERAGE_SUMMARY" | "CUSTOM" | etc.
  title:       string;
  format:      "PDF" | "CSV" | "XLSX" | "JSON";
  status:      ReportStatus;
  generatedBy: Types.ObjectId;
  config:      Record<string, unknown>;
  fileUrl?:    string;
  fileSize?:   number;
  errorMsg?:   string;
  createdAt:   Date;
  updatedAt:   Date;
}

export interface IScheduledReport extends Document {
  scheduleId:  string;
  templateKey: string;
  title:       string;
  frequency:   "DAILY" | "WEEKLY" | "MONTHLY";
  recipients:  string[];
  isActive:    boolean;
  createdBy:   Types.ObjectId;
  lastRunAt?:  Date;
  nextRunAt?:  Date;
  createdAt:   Date;
  updatedAt:   Date;
}

const ReportLogSchema = new Schema<IReportLog>(
  {
    reportId:    { type: String, required: true, unique: true },
    type:        { type: String, required: true },
    title:       { type: String, required: true },
    format:      { type: String, enum: ["PDF","CSV","XLSX","JSON"], required: true },
    status:      { type: String, enum: Object.values(REPORT_STATUS), default: REPORT_STATUS.PENDING },
    generatedBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    config:      { type: Schema.Types.Mixed, default: {} },
    fileUrl:     { type: String },
    fileSize:    { type: Number },
    errorMsg:    { type: String },
  },
  { timestamps: true }
);

const ScheduledReportSchema = new Schema<IScheduledReport>(
  {
    scheduleId:  { type: String, required: true, unique: true },
    templateKey: { type: String, required: true },
    title:       { type: String, required: true },
    frequency:   { type: String, enum: ["DAILY","WEEKLY","MONTHLY"], required: true },
    recipients:  { type: [String], default: [] },
    isActive:    { type: Boolean, default: true },
    createdBy:   { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    lastRunAt:   { type: Date },
    nextRunAt:   { type: Date },
  },
  { timestamps: true }
);

ReportLogSchema.index({ generatedBy: 1 });
ReportLogSchema.index({ status: 1 });
ReportLogSchema.index({ createdAt: -1 });
ScheduledReportSchema.index({ isActive: 1 });
ScheduledReportSchema.index({ nextRunAt: 1 });

export const ReportLog: Model<IReportLog> =
  (models.ReportLog as Model<IReportLog>) ?? model<IReportLog>("ReportLog", ReportLogSchema);

export const ScheduledReport: Model<IScheduledReport> =
  (models.ScheduledReport as Model<IScheduledReport>) ?? model<IScheduledReport>("ScheduledReport", ScheduledReportSchema);
