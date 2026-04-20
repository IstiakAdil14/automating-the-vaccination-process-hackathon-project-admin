"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { FraudAlert, FRAUD_STATUS, type FraudType, type FraudSeverity, type FraudStatus } from "@/models/FraudAlert";
import { User } from "@/models/User";
import { Staff } from "@/models/Staff";
import { Center } from "@/models/Center";
import { getAdminSession } from "@/lib/getAdminSession";
import type { ActionResult } from "./centers";

/* --- Shared types ------------------------------------------------------------- */
export interface FraudAlertRow {
  _id:        string;
  alertId:    string;
  type:       FraudType;
  severity:   FraudSeverity;
  status:     FraudStatus;
  centerId:   string;
  centerName: string;
  division:   string;
  staffId?:   string;
  staffName?: string;
  userId?:    string;
  userName?:  string;
  userNid?:   string;
  details:    Record<string, unknown>;
  resolution?: string;
  resolvedAt?: string;
  createdAt:  string;
}

export interface CaseDetail extends FraudAlertRow {
  centerFlags:       FraudAlertRow[];   // other flags from same center last 30d
  vaccinationHistory: object[];
}

export interface AuditEntry {
  _id:        string;
  timestamp:  string;
  userId:     string;
  userName:   string;
  userRole:   string;
  actionType: "CREATE" | "VIEW" | "EDIT" | "DELETE" | "EXPORT" | "LOGIN" | "SUSPEND" | "RESOLVE";
  resource:   string;
  resourceId: string;
  ipAddress:  string;
  details?:   string;
}

export interface AuditSearchParams {
  query?:      string;
  actionType?: string;
  dateFrom?:   string;
  dateTo?:     string;
  page?:       number;
  limit?:      number;
}

/* --- Mock audit log (replace with AuditLog model when available) -------------- */
const MOCK_AUDIT: AuditEntry[] = Array.from({ length: 200 }, (_, i) => {
  const actions: AuditEntry["actionType"][] = ["CREATE","VIEW","EDIT","DELETE","EXPORT","LOGIN","SUSPEND","RESOLVE"];
  const roles   = ["SUPER_ADMIN","NATIONAL_ADMIN","DIVISION_ADMIN","STAFF"];
  const resources = ["FraudAlert","User","Center","Staff","VaccinationRecord","Inventory","Appointment"];
  const ts = new Date(Date.now() - i * 3_600_000);
  return {
    _id:        `audit-${i}`,
    timestamp:  ts.toISOString(),
    userId:     `user-${(i % 10) + 1}`,
    userName:   ["Dr. Rahman","Admin Karim","Staff Nadia","Super Admin","Div Admin Sylhet"][i % 5],
    userRole:   roles[i % roles.length],
    actionType: actions[i % actions.length],
    resource:   resources[i % resources.length],
    resourceId: `REC-${1000 + i}`,
    ipAddress:  `192.168.${Math.floor(i / 10) % 256}.${i % 256}`,
    details:    i % 3 === 0 ? "Bulk operation" : undefined,
  };
});

/* --- getFraudAlerts ----------------------------------------------------------- */
export async function getFraudAlerts(filters?: {
  type?: string; severity?: string; status?: string;
  centerId?: string; dateFrom?: string; dateTo?: string;
  page?: number; limit?: number;
}): Promise<ActionResult<{ data: FraudAlertRow[]; total: number; pages: number }>> {
  await connectDB();

  const page  = filters?.page  ?? 1;
  const limit = filters?.limit ?? 30;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (filters?.type)     filter.type     = filters.type;
  if (filters?.severity) filter.severity = filters.severity;
  if (filters?.status)   filter.status   = filters.status;
  if (filters?.centerId) filter.centerId = filters.centerId;
  if (filters?.dateFrom || filters?.dateTo) {
    filter.createdAt = {};
    if (filters.dateFrom) filter.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo)   filter.createdAt.$lte = new Date(filters.dateTo);
  }

  const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const [docs, total] = await Promise.all([
    FraudAlert.find(filter)
      .populate("centerId", "name address")
      .populate("staffId",  "name")
      .populate("userId",   "name nid")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    FraudAlert.countDocuments(filter),
  ]);

  const data: FraudAlertRow[] = docs
    .map((d) => {
      const center  = d.centerId as unknown as { _id: unknown; name: string; address: { division: string } };
      const staff   = d.staffId  as unknown as { _id: unknown; name: string } | null;
      const user    = d.userId   as unknown as { _id: unknown; name: string; nid: string } | null;
      return {
        _id:        String(d._id),
        alertId:    d.alertId,
        type:       d.type,
        severity:   d.severity,
        status:     d.status,
        centerId:   String(center._id),
        centerName: center.name,
        division:   center.address.division,
        staffId:    staff ? String(staff._id) : undefined,
        staffName:  staff?.name,
        userId:     user ? String(user._id) : undefined,
        userName:   user?.name,
        userNid:    user?.nid,
        details:    d.details,
        resolution: d.resolution,
        resolvedAt: d.resolvedAt?.toISOString(),
        createdAt:  d.createdAt.toISOString(),
      };
    })
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  return { ok: true, data: { data, total, pages: Math.ceil(total / limit) } };
}

/* --- getCaseDetail ------------------------------------------------------------ */
export async function getCaseDetail(alertId: string): Promise<ActionResult<CaseDetail>> {
  await connectDB();

  const doc = await FraudAlert.findById(alertId)
    .populate("centerId", "name address")
    .populate("staffId",  "name")
    .populate("userId",   "name nid")
    .lean();

  if (!doc) return { ok: false, error: "Alert not found" };

  const center = doc.centerId as unknown as { _id: unknown; name: string; address: { division: string } };
  const staff  = doc.staffId  as unknown as { _id: unknown; name: string } | null;
  const user   = doc.userId   as unknown as { _id: unknown; name: string; nid: string } | null;

  // Other flags from same center in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const centerFlagDocs = await FraudAlert.find({
    centerId:  doc.centerId,
    _id:       { $ne: doc._id },
    createdAt: { $gte: thirtyDaysAgo },
  }).lean();

  const centerFlags: FraudAlertRow[] = centerFlagDocs.map((f) => ({
    _id:        String(f._id),
    alertId:    f.alertId,
    type:       f.type,
    severity:   f.severity,
    status:     f.status,
    centerId:   String(center._id),
    centerName: center.name,
    division:   center.address.division,
    details:    f.details,
    createdAt:  f.createdAt.toISOString(),
  }));

  const base: FraudAlertRow = {
    _id:        String(doc._id),
    alertId:    doc.alertId,
    type:       doc.type,
    severity:   doc.severity,
    status:     doc.status,
    centerId:   String(center._id),
    centerName: center.name,
    division:   center.address.division,
    staffId:    staff ? String(staff._id) : undefined,
    staffName:  staff?.name,
    userId:     user ? String(user._id) : undefined,
    userName:   user?.name,
    userNid:    user?.nid,
    details:    doc.details,
    resolution: doc.resolution,
    resolvedAt: doc.resolvedAt?.toISOString(),
    createdAt:  doc.createdAt.toISOString(),
  };

  return { ok: true, data: { ...base, centerFlags, vaccinationHistory: [] } };
}

/* --- resolveCase -------------------------------------------------------------- */
export type ResolutionAction = "FALSE_POSITIVE" | "CONFIRMED_FRAUD" | "INCONCLUSIVE";

export async function resolveCase(
  alertId: string,
  action: ResolutionAction,
  note: string,
  followUpDate?: string
): Promise<ActionResult<void>> {
  const session = await getAdminSession();
  await connectDB();

  const alert = await FraudAlert.findById(alertId);
  if (!alert) return { ok: false, error: "Alert not found" };

  if (action === "FALSE_POSITIVE") {
    alert.status     = FRAUD_STATUS.FALSE_POSITIVE;
    alert.resolution = note;
  } else if (action === "CONFIRMED_FRAUD") {
    alert.status     = FRAUD_STATUS.RESOLVED;
    alert.resolution = `CONFIRMED_FRAUD: ${note}`;
    // Block citizen if linked
    if (alert.userId) {
      await User.findByIdAndUpdate(alert.userId, {
        isSuspended:     true,
        suspendedReason: `FRAUD_CONFIRMED by admin ${session.user.id}: ${note}`,
      });
    }
    // Suspend staff if linked
    if (alert.staffId) {
      await Staff.findByIdAndUpdate(alert.staffId, {
        isSuspended:     true,
        isActive:        false,
        suspendedReason: `FRAUD_CONFIRMED by admin ${session.user.id}: ${note}`,
      });
    }
  } else {
    alert.status     = FRAUD_STATUS.INVESTIGATING;
    alert.resolution = `INCONCLUSIVE: ${note}${followUpDate ? ` - follow-up: ${followUpDate}` : ""}`;
  }

  alert.resolvedBy = session.user.id as unknown as typeof alert.resolvedBy;
  alert.resolvedAt = new Date();
  await alert.save();

  console.info("[AUDIT] resolveCase", {
    adminId: session.user.id, alertId, action, note, ts: new Date().toISOString(),
  });

  revalidatePath("/fraud");
  return { ok: true, data: undefined };
}

/* --- searchAuditLog ----------------------------------------------------------- */
export async function searchAuditLog(
  params: AuditSearchParams
): Promise<ActionResult<{ data: AuditEntry[]; total: number; pages: number }>> {
  const page  = params.page  ?? 1;
  const limit = params.limit ?? 50;

  let filtered = MOCK_AUDIT;

  if (params.query) {
    const q = params.query.toLowerCase();
    filtered = filtered.filter((e) =>
      e.userName.toLowerCase().includes(q) ||
      e.resourceId.toLowerCase().includes(q) ||
      e.ipAddress.includes(q) ||
      e.resource.toLowerCase().includes(q)
    );
  }
  if (params.actionType && params.actionType !== "all") {
    filtered = filtered.filter((e) => e.actionType === params.actionType);
  }
  if (params.dateFrom) {
    filtered = filtered.filter((e) => e.timestamp >= params.dateFrom!);
  }
  if (params.dateTo) {
    filtered = filtered.filter((e) => e.timestamp <= params.dateTo! + "T23:59:59");
  }

  const total = filtered.length;
  const data  = filtered.slice((page - 1) * limit, page * limit);

  return { ok: true, data: { data, total, pages: Math.ceil(total / limit) } };
}

/* --- exportAudit -------------------------------------------------------------- */
export async function exportAudit(
  params: AuditSearchParams,
  format: "csv" | "pdf"
): Promise<ActionResult<{ content: string; filename: string }>> {
  const session = await getAdminSession();
  const result  = await searchAuditLog({ ...params, limit: 10_000 });
  if (!result.ok) return { ok: false, error: result.error };

  const rows = result.data.data;
  const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.${format}`;

  if (format === "csv") {
    const headers = ["Timestamp","User","Role","Action","Resource","Record ID","IP Address","Details"];
    const lines   = rows.map((r) => [
      r.timestamp, r.userName, r.userRole, r.actionType,
      r.resource, r.resourceId, r.ipAddress, r.details ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const content = [headers.join(","), ...lines].join("\n");

    console.info("[AUDIT] exportAudit", { adminId: session.user.id, format, rows: rows.length, ts: new Date().toISOString() });
    return { ok: true, data: { content, filename } };
  }

  // PDF: return a simple text representation (real PDF generation needs a library)
  const content = rows.map((r) =>
    `[${r.timestamp}] ${r.userName} (${r.userRole}) - ${r.actionType} ${r.resource} ${r.resourceId} from ${r.ipAddress}`
  ).join("\n");

  return { ok: true, data: { content, filename } };
}
