"use client";

import { useState, useTransition, useEffect } from "react";
import { AlertTriangle, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import { getExpiryData, reportWastage, type ExpiryRow } from "@/app/actions/supply";

function rowClass(daysLeft: number) {
  if (daysLeft <= 7)  return "bg-[var(--danger-subtle)] hover:bg-red-100 dark:hover:bg-red-950";
  if (daysLeft <= 30) return "bg-[var(--warning-subtle)] hover:bg-amber-100 dark:hover:bg-amber-950";
  return "hover:bg-[var(--background-subtle)]";
}

function DaysLeftBadge({ days }: { days: number }) {
  const cls = days <= 7
    ? "bg-[var(--danger-subtle)] text-[var(--danger)] border-[var(--danger)]"
    : days <= 30
      ? "bg-[var(--warning-subtle)] text-[var(--warning)] border-[var(--warning)]"
      : "bg-[var(--background-subtle)] text-[var(--foreground-muted)] border-[var(--border)]";
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold", cls)}>
      {days <= 7 && <AlertTriangle className="mr-1 inline h-3 w-3" />}{days}d
    </span>
  );
}

interface WastageDialogProps {
  row: ExpiryRow | null;
  onClose: () => void;
  onReported: () => void;
}
function WastageDialog({ row, onClose, onReported }: WastageDialogProps) {
  const [qty,      setQty]      = useState("");
  const [reason,   setReason]   = useState("");
  const [error,    setError]    = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => { setQty(""); setReason(""); setError(""); }, [row]);

  function submit() {
    const n = Number(qty);
    if (!n || n <= 0 || n > (row?.quantity ?? 0)) { setError(`Quantity must be 1-${row?.quantity}`); return; }
    if (reason.trim().length < 5) { setError("Reason required (min 5 chars)"); return; }
    setError("");
    startTransition(async () => {
      const res = await reportWastage(row!.inventoryId, n, reason);
      if (!res.ok) { setError(res.error); return; }
      onReported();
    });
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--danger)]">
            <Trash2 className="h-5 w-5" /> Report Wastage
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-2">
          {row && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background-subtle)] p-3 text-sm">
              <p className="font-semibold">{row.centerName} - {row.shortName}</p>
              <p className="text-xs text-[var(--foreground-muted)]">
                {row.quantity} doses - Expires {formatDate(row.expiryDate)} ({row.daysLeft}d)
              </p>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Wasted Quantity *
            </label>
            <input
              type="number"
              value={qty}
              min={1}
              max={row?.quantity}
              onChange={(e) => setQty(e.target.value)}
              placeholder={`Max ${row?.quantity}`}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--danger)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. Cold chain failure, expired before use-"
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--danger)] focus:outline-none"
            />
          </div>
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={submit} disabled={isPending} className="bg-[var(--danger)] text-white hover:opacity-90">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Log Wastage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExpiryWastageTracker() {
  const [data,       setData]       = useState<ExpiryRow[]>([]);
  const [wastageRow, setWastageRow] = useState<ExpiryRow | null>(null);
  const [isPending,  startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const res = await getExpiryData(90);
      if (res.ok) setData(res.data);
    });
  }

  useEffect(() => { load(); }, []);

  const critical = data.filter((r) => r.daysLeft <= 7).length;
  const warning  = data.filter((r) => r.daysLeft > 7 && r.daysLeft <= 30).length;

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Summary banners */}
        {(critical > 0 || warning > 0) && (
          <div className="flex flex-wrap gap-3">
            {critical > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] px-4 py-2.5">
                <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />
                <p className="text-sm font-semibold text-[var(--danger)]">
                  {critical} batch{critical !== 1 ? "es" : ""} expire within 7 days
                </p>
              </div>
            )}
            {warning > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--warning)] bg-[var(--warning-subtle)] px-4 py-2.5">
                <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                <p className="text-sm font-semibold text-[var(--warning)]">
                  {warning} batch{warning !== 1 ? "es" : ""} expire within 30 days
                </p>
              </div>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                  {["Center","Division","Vaccine","Quantity","Expiry Date","Days Left","Wastage Rate","Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isPending ? (
                  <tr><td colSpan={8} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--accent)]" />
                  </td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-[var(--accent)]" />
                      <p className="text-sm text-[var(--foreground-muted)]">No vaccines expiring within 90 days</p>
                    </div>
                  </td></tr>
                ) : data.map((row) => (
                  <tr key={row.inventoryId} className={cn("transition-colors", rowClass(row.daysLeft))}>
                    <td className="px-4 py-3.5 font-medium text-[var(--foreground)]">{row.centerName}</td>
                    <td className="px-4 py-3.5 text-sm text-[var(--foreground-muted)]">{row.division}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold">{row.shortName}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">{row.vaccineName}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums">{row.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-xs">{formatDate(row.expiryDate)}</td>
                    <td className="px-4 py-3.5"><DaysLeftBadge days={row.daysLeft} /></td>
                    <td className="px-4 py-3.5">
                      <span className={cn("font-mono text-sm", row.wastageRate > 20 ? "text-[var(--danger)]" : "text-[var(--foreground-muted)]")}>
                        {row.wastageRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Button size="sm" variant="outline" onClick={() => setWastageRow(row)}
                        className="text-xs text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-subtle)]">
                        <Trash2 className="h-3.5 w-3.5" /> Report
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <WastageDialog
        row={wastageRow}
        onClose={() => setWastageRow(null)}
        onReported={() => { setWastageRow(null); load(); }}
      />
    </>
  );
}
