"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, UserPlus, ArrowRightLeft, UserMinus, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { approveRequest } from "@/app/actions/staff";
import { getAdminSessionOrNull } from "@/lib/getAdminSession";

/* --- Types -------------------------------------------------------------------- */
interface StaffRequestItem {
  _id:          string;
  type:         "NEW_HIRE" | "TRANSFER" | "REMOVAL";
  urgency:      "LOW" | "MEDIUM" | "HIGH";
  reason:       string;
  requestedRole?: string;
  status:       "PENDING" | "APPROVED" | "DENIED";
  createdAt:    string;
  centerId:     { _id: string; name: string; address: { division: string } };
  staffId?:     { name: string; role: string };
}

const TYPE_CONFIG = {
  NEW_HIRE: { label: "New Hire",  icon: UserPlus,       color: "var(--accent)" },
  TRANSFER: { label: "Transfer",  icon: ArrowRightLeft,  color: "var(--blue-500)" },
  REMOVAL:  { label: "Removal",   icon: UserMinus,       color: "var(--danger)" },
};

const URGENCY_CONFIG = {
  LOW:    { label: "Low",    cls: "bg-[var(--background-subtle)] text-[var(--foreground-muted)]" },
  MEDIUM: { label: "Medium", cls: "bg-[var(--warning-subtle)] text-[var(--warning-foreground)]" },
  HIGH:   { label: "High",   cls: "bg-[var(--danger-subtle)] text-[var(--danger)]" },
};

/* --- Request card ------------------------------------------------------------- */
function RequestCard({
  req, onAction,
}: {
  req: StaffRequestItem;
  onAction: (id: string, action: "approve" | "deny", reason?: string) => void;
}) {
  const [denyMode,  setDenyMode]  = useState(false);
  const [denyReason, setDenyReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const TypeIcon = TYPE_CONFIG[req.type].icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${TYPE_CONFIG[req.type].color}15` }}>
              <TypeIcon className="h-4 w-4" style={{ color: TYPE_CONFIG[req.type].color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">{TYPE_CONFIG[req.type].label}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3 w-3 text-[var(--foreground-muted)]" />
                <span className="text-xs text-[var(--foreground-muted)]">{req.centerId.name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", URGENCY_CONFIG[req.urgency].cls)}>
              {URGENCY_CONFIG[req.urgency].label}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-[var(--foreground-muted)]">
              <Clock className="h-3 w-3" />
              {formatDate(req.createdAt)}
            </div>
          </div>
        </div>

        {/* Reason */}
        <p className="text-xs text-[var(--foreground-muted)] mb-3 line-clamp-2">{req.reason}</p>

        {req.staffId && (
          <p className="text-xs text-[var(--foreground-muted)] mb-3">
            Staff: <span className="font-medium text-[var(--foreground)]">{req.staffId.name}</span> ({req.staffId.role})
          </p>
        )}

        {/* Actions */}
        {req.status === "PENDING" && !denyMode && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => startTransition(() => onAction(req._id, "approve"))}
              disabled={isPending}
              className="flex-1 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDenyMode(true)} disabled={isPending}
              className="flex-1 text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-subtle)]">
              <XCircle className="h-3.5 w-3.5" /> Deny
            </Button>
          </div>
        )}

        {/* Deny reason input */}
        {denyMode && (
          <div className="space-y-2">
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              rows={2}
              placeholder="Reason for denial (min 10 characters)-"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--danger)] focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setDenyMode(false)} className="flex-1">Cancel</Button>
              <Button
                size="sm"
                disabled={denyReason.length < 10 || isPending}
                onClick={() => startTransition(() => onAction(req._id, "deny", denyReason))}
                className="flex-1 bg-[var(--danger)] text-white hover:bg-[var(--red-600)]"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Deny
              </Button>
            </div>
          </div>
        )}

        {/* Resolved badge */}
        {req.status !== "PENDING" && (
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            req.status === "APPROVED" ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "bg-[var(--danger-subtle)] text-[var(--danger)]"
          )}>
            {req.status === "APPROVED" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {req.status}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* --- StaffRequestsPanel ------------------------------------------------------- */
export function StaffRequestsPanel() {
  const [requests, setRequests] = useState<StaffRequestItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<"PENDING" | "all">("PENDING");

  useEffect(() => {
    fetch("/api/admin/staff/requests")
      .then((r) => r.json())
      .then((d) => setRequests(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(id: string, action: "approve" | "deny", reason?: string) {
    /* Get reviewer ID from session - simplified here */
    const payload = action === "approve" ? { action: "approve" as const } : { action: "deny" as const, reason: reason! };
    await approveRequest(id, payload, "admin");
    setRequests((prev) => prev.map((r) => r._id === id ? { ...r, status: action === "approve" ? "APPROVED" : "DENIED" } : r));
  }

  const filtered = filter === "PENDING" ? requests.filter((r) => r.status === "PENDING") : requests;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">Staff Requests</span>
          {pendingCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--amber-500)] px-1.5 text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </div>
        <div className="flex rounded-lg border border-[var(--border)] p-0.5">
          {(["PENDING", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-all",
                filter === f ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)]"
              )}
            >
              {f === "PENDING" ? "Pending" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-[var(--border)] bg-[var(--surface)] skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)]">
          <p className="text-sm text-[var(--foreground-muted)]">No {filter === "PENDING" ? "pending" : ""} requests</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((req) => (
              <RequestCard key={req._id} req={req} onAction={handleAction} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
