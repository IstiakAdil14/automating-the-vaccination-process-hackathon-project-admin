import { connectDB } from "./db";
import { Schema, model, models, type Model, type Document } from "mongoose";

/* --- AuditLog model ----------------------------------------------------------- */
export interface IAuditLog extends Document {
  timestamp:  Date;
  adminId:    string;
  adminName:  string;
  action:     string;
  resource:   string;
  resourceId?: string;
  ip:         string;
  userAgent:  string;
  meta?:      Record<string, unknown>;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    timestamp:  { type: Date, default: Date.now, index: true },
    adminId:    { type: String, required: true, index: true },
    adminName:  { type: String, required: true },
    action:     { type: String, required: true },   /* e.g. "VIEW", "CREATE", "UPDATE", "DELETE" */
    resource:   { type: String, required: true },   /* e.g. "center", "staff", "vaccine" */
    resourceId: { type: String },
    ip:         { type: String, default: "unknown" },
    userAgent:  { type: String, default: "unknown" },
    meta:       { type: Schema.Types.Mixed },
  },
  { capped: { size: 100 * 1024 * 1024, max: 500_000 } } /* 100 MB capped collection */
);

AuditLogSchema.index({ resource: 1, action: 1 });
AuditLogSchema.index({ adminId: 1, timestamp: -1 });

export const AuditLog: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog>) ??
  model<IAuditLog>("AuditLog", AuditLogSchema);

/* --- Log entry shape ---------------------------------------------------------- */
export interface LogEntry {
  adminId:    string;
  adminName:  string;
  action:     string;
  resource:   string;
  resourceId?: string;
  ip?:        string;
  userAgent?: string;
  meta?:      Record<string, unknown>;
}

/* --- Logger ------------------------------------------------------------------- */
export const logger = {
  async log(entry: LogEntry): Promise<void> {
    const record = {
      timestamp: new Date(),
      adminId:   entry.adminId,
      adminName: entry.adminName,
      action:    entry.action,
      resource:  entry.resource,
      resourceId: entry.resourceId,
      ip:        entry.ip ?? "unknown",
      userAgent: entry.userAgent ?? "unknown",
      meta:      entry.meta,
    };

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[AUDIT] ${record.timestamp.toISOString()} | ${record.adminName} | ${record.action} ${record.resource}${record.resourceId ? `#${record.resourceId}` : ""}`
      );
    }

    try {
      await connectDB();
      await AuditLog.create(record);
    } catch (err) {
      /* Never throw - logging must not break the request */
      console.error("[logger] Failed to write audit log:", err);
    }
  },

  /* Convenience wrappers */
  view:   (entry: Omit<LogEntry, "action">) => logger.log({ ...entry, action: "VIEW" }),
  create: (entry: Omit<LogEntry, "action">) => logger.log({ ...entry, action: "CREATE" }),
  update: (entry: Omit<LogEntry, "action">) => logger.log({ ...entry, action: "UPDATE" }),
  delete: (entry: Omit<LogEntry, "action">) => logger.log({ ...entry, action: "DELETE" }),
  export: (entry: Omit<LogEntry, "action">) => logger.log({ ...entry, action: "EXPORT" }),
};

/* --- Extract IP from request headers ----------------------------------------- */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
