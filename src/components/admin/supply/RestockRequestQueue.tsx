"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { approveRestock, denyRestock, type RestockRequest } from "@/app/actions/supply";

/* --- Mock data (replace with API call when RestockRequest model exists) ------- */
const MOCK_REQUESTS: RestockRequest[] = [
  { _id: "r1", centerId: "c1", centerName: "Dhaka Medical Center", division: "Dhaka", vaccineId: "v1", vaccineName: "COVID-19 Vaccine", shortName: "COVID", qtyRequested: 5000, submittedAt: new Date(Date.now() - 86400000).toISOString(), urgency: "CRITICAL", status: "PENDING" },
  { _id: "r2", centerId: "c2", centerName: "Chittagong General Hospital", division: "Chittagong", vaccineId: "v2", vaccineName: "BCG Vaccine", shortName: "BCG", qtyRequested: 1200, submittedAt: new Date(Date.now() - 172800000).toISOString(), urgency: "HIGH", status: "PENDING" },
  { _id: "r3", centerId: "c3", centerName: "Sylhet MAG Osmani", division: "Sylhet", vaccineId: "v3", vaccineName: "MMR Vaccine", shortName: "MMR", qtyRequested: 800, submittedAt: new Date(Date.now() - 259200000).toISOString(), urgency: "MEDIUM", status: "PENDING" },
  { _id: "r4", centerId: "c4", centerName: "Rajshahi Medical College", division: "Rajshahi", vaccineId: "v1", vaccineName: "COVID-19 Vaccine", shortName: "COVID", qtyRequested: 2000, submittedAt: new Date(Date.now() - 345600000).toISOString(), urgency: "HIGH", status: "PENDING" },
  { _id: "r5", centerId: "c5", centerName: "Khulna General Hospital", division: "Khulna", vaccineId: "v4", vaccineName: "DPT Vaccine", shortName: "DPT", qtyRequested: 600, submittedAt: new Date(Date.now() - 432000000).toISOString(), urgency: "LOW", status: "PENDING" },
];

const URGENCY_STYLES: Record<RestockRequest["urgency"], string> = {
  CRITICAL: "bg-[var(--danger-subtle)] text-[var(--danger)] border-[var(--danger)]",
  HIGH:     "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300",
  MEDIUM:   "bg-[var(--warning-subtle)] text-[var(--warning)] border-[var(--warning)]",
  LOW:      "bg-[var(--background-subtle)] text-[var(--foreground-muted)] border-[var(--border)]",
};

const URGENCY_ORDER: Record<RestockRequest["urgency"], number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

interface ApproveFormProps { requestId: string; onDone: () => void; onCancel: () => void }
function ApproveForm({ requestId, onDone, onCancel }: ApproveFormProps) {
  const [qty,      setQty]      = useState("");
  const [date,     setDate]     = useState("");
  const [batch,    setBatch]    = useState("");
  const [lot,      setLot]      = useState("");
  const [error,    setError]    = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!qty || !date || !batch || !lot) { setError("All fields required"); return; }
    setError("");
    startTransition(async () => {
      const res = await approveRestock(requestId, { confirmedQty: Number(qty), dispatchDate: date, batchNo: batch, lotNo: lot });
      if (!res.ok) { setError(res.error); return; }
      onDone();
    });
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Approve Restock</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Confirmed Qty", value: qty, set: setQty, type: "number", placeholder: "e.g. 5000" },
          { label: "Dispatch Date", value: date, set: setDate, type: "date", placeholder: "" },
          { label: "Batch No",      value: batch, set: setBatch, type: "text", placeholder: "BATCH-001" },
          { label: "Lot No",        value: lot,   set: setLot,   type: "text", placeholder: "LOT-2024" },
        ].map(({ label, value, set, type, placeholder }) => (
          <div key={label}>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{label}</label>
            <input
              type={type}
              value={value}
              placeholder={placeholder}
              onChange={(e) => set(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isPending} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={submit} disabled={isPending} className="flex-1 bg-[var(--accent)] text-white hover:opacity-90">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm Dispatch
        </Button>
      </div>
    </div>
  );
}

interface DenyFormProps { requestId: string; onDone: () => void; onCancel: () => void }
function DenyForm({ requestId, onDone, onCancel }: DenyFormProps) {
  const [reason,   setReason]   = useState("");
  const [error,    setError]    = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (reason.trim().length < 10) { setError("Reason must be at least 10 characters"); return; }
    setError("");
    startTransition(async () => {
      const res = await denyRestock(requestId, reason);
      if (!res.ok) { setError(res.error); return; }
      onDone();
    });
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--danger)]">Deny Request</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Reason for denial (min 10 characters)-"
        className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--danger)] focus:outline-none"
      />
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isPending} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={submit} disabled={isPending} className="flex-1 bg-[var(--danger)] text-white hover:opacity-90">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Deny
        </Button>
      </div>
    </div>
  );
}

export function RestockRequestQueue() {
  const [requests,  setRequests]  = useState<RestockRequest[]>(
    [...MOCK_REQUESTS].sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency])
  );
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [action,    setAction]    = useState<Record<string, "approve" | "deny">>({});
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [bulkPending, startBulk]  = useTransition();

  function dismiss(id: string) {
    setRequests((prev) => prev.filter((r) => r._id !== id));
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function bulkApprove() {
    startBulk(async () => {
      await Promise.all(
        Array.from(selected).map((id) => {
          const qty = requests.find((r) => r._id === id)?.qtyRequested ?? 0;
          return approveRestock(id, { confirmedQty: qty, dispatchDate: new Date().toISOString().slice(0, 10), batchNo: "BULK", lotNo: "BULK" });
        })
      );
      setRequests((prev) => prev.filter((r) => !selected.has(r._id)));
      setSelected(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] px-4 py-3">
          <span className="text-sm font-medium text-[var(--accent)]">{selected.size} selected</span>
          <Button size="sm" onClick={bulkApprove} disabled={bulkPending} className="ml-auto bg-[var(--accent)] text-white hover:opacity-90">
            {bulkPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Bulk Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {requests.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border)] py-16">
          <CheckCircle2 className="h-8 w-8 text-[var(--accent)]" />
          <p className="text-sm text-[var(--foreground-muted)]">No pending restock requests</p>
        </div>
      )}

      {requests.map((req) => (
        <div key={req._id} className={cn(
          "rounded-xl border p-5 transition-colors",
          req.urgency === "CRITICAL" ? "border-[var(--danger)]" :
          req.urgency === "HIGH"     ? "border-orange-300 dark:border-orange-700" :
          "border-[var(--border)]",
          "bg-[var(--surface)]"
        )}>
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selected.has(req._id)}
              onChange={() => toggleSelect(req._id)}
              className="mt-1 h-4 w-4 cursor-pointer accent-[var(--accent)]"
            />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-[var(--foreground)]">{req.centerName}</p>
                <span className="text-xs text-[var(--foreground-muted)]">{req.division}</span>
                <span className={cn("ml-auto rounded-full border px-2.5 py-0.5 text-xs font-bold", URGENCY_STYLES[req.urgency])}>
                  {req.urgency === "CRITICAL" && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                  {req.urgency}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span><span className="text-[var(--foreground-muted)]">Vaccine: </span><strong>{req.shortName}</strong></span>
                <span><span className="text-[var(--foreground-muted)]">Requested: </span><strong>{req.qtyRequested.toLocaleString()} doses</strong></span>
                <span className="text-xs text-[var(--foreground-muted)]">Submitted {formatDate(req.submittedAt)}</span>
              </div>

              {/* Action buttons */}
              {!action[req._id] && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => setAction((a) => ({ ...a, [req._id]: "approve" }))}
                    className="bg-[var(--accent)] text-white hover:opacity-90 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAction((a) => ({ ...a, [req._id]: "deny" }))}
                    className="text-xs text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-subtle)]">
                    <XCircle className="h-3.5 w-3.5" /> Deny
                  </Button>
                  <button onClick={() => setExpanded((e) => e === req._id ? null : req._id)}
                    className="ml-auto text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                    {expanded === req._id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {action[req._id] === "approve" && (
                <ApproveForm
                  requestId={req._id}
                  onDone={() => dismiss(req._id)}
                  onCancel={() => setAction((a) => { const n = { ...a }; delete n[req._id]; return n; })}
                />
              )}
              {action[req._id] === "deny" && (
                <DenyForm
                  requestId={req._id}
                  onDone={() => dismiss(req._id)}
                  onCancel={() => setAction((a) => { const n = { ...a }; delete n[req._id]; return n; })}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
