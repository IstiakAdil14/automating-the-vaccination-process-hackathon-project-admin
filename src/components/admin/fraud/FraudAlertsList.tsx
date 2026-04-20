"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { ShieldAlert, Loader2, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { getFraudAlerts, type FraudAlertRow } from "@/app/actions/fraud";
import { CaseInvestigationDrawer } from "./CaseInvestigationDrawer";

const TYPE_LABELS: Record<string, string> = {
  DUPLICATE_NID:  "Duplicate NID",
  TAMPERED_QR:    "Tampered QR",
  MULTI_LOCATION: "Multi-Location",
  INVALID_BATCH:  "Invalid Batch",
};

const SEVERITY_BORDER: Record<string, string> = {
  CRITICAL: "border-l-[var(--danger)]",
  HIGH:     "border-l-orange-400",
  MEDIUM:   "border-l-[var(--info)]",
  LOW:      "border-l-[var(--border)]",
};

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-[var(--danger-subtle)] text-[var(--danger)]",
  HIGH:     "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  MEDIUM:   "bg-[var(--info-subtle)] text-[var(--info)]",
  LOW:      "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
};

const STATUS_BADGE: Record<string, string> = {
  OPEN:           "bg-[var(--danger-subtle)] text-[var(--danger)]",
  INVESTIGATING:  "bg-[var(--warning-subtle)] text-[var(--warning)]",
  RESOLVED:       "bg-[var(--accent-subtle)] text-[var(--accent)]",
  FALSE_POSITIVE: "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
};

function maskNid(nid?: string) {
  if (!nid) return null;
  return "XXXX-XXXX-" + nid.slice(-4);
}

export function FraudAlertsList() {
  const [data,       setData]       = useState<FraudAlertRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [page,       setPage]       = useState(1);
  const [type,       setType]       = useState("all");
  const [severity,   setSeverity]   = useState("all");
  const [status,     setStatus]     = useState("all");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();

  const load = useCallback((p: number) => {
    startTransition(async () => {
      const res = await getFraudAlerts({
        type:     type     !== "all" ? type     : undefined,
        severity: severity !== "all" ? severity : undefined,
        status:   status   !== "all" ? status   : undefined,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo   || undefined,
        page: p, limit: 30,
      });
      if (res.ok) {
        setData(res.data.data);
        setTotal(res.data.total);
        setPages(res.data.pages);
        setPage(p);
      }
    });
  }, [type, severity, status, dateFrom, dateTo]);

  useEffect(() => { load(1); }, [load]);

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-[var(--foreground-muted)]" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Alert Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {["CRITICAL","HIGH","MEDIUM","LOW"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {["OPEN","INVESTIGATING","RESOLVED","FALSE_POSITIVE"].map((s) => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
          <span className="text-xs text-[var(--foreground-muted)]">to</span>
          <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
          <span className="ml-auto text-xs text-[var(--foreground-muted)]">
            {isPending ? "Loading-" : `${formatNumber(total)} alert${total !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Alert cards */}
        {isPending ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border)] py-16">
            <ShieldAlert className="h-8 w-8 text-[var(--foreground-muted)]" />
            <p className="text-sm text-[var(--foreground-muted)]">No fraud alerts found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.map((alert) => (
              <button
                key={alert._id}
                onClick={() => setSelectedId(alert._id)}
                className={cn(
                  "w-full rounded-xl border border-[var(--border)] border-l-4 bg-[var(--surface)] p-4 text-left transition-colors hover:bg-[var(--background-subtle)]",
                  SEVERITY_BORDER[alert.severity]
                )}
              >
                <div className="flex flex-wrap items-start gap-2">
                  {/* Type badge */}
                  <span className="rounded-full bg-[var(--background-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--foreground)]">
                    {TYPE_LABELS[alert.type] ?? alert.type}
                  </span>
                  {/* Severity badge */}
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", SEVERITY_BADGE[alert.severity])}>
                    {alert.severity}
                  </span>
                  {/* Status badge */}
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_BADGE[alert.status])}>
                    {alert.status.replace("_", " ")}
                  </span>
                  <span className="ml-auto text-xs text-[var(--foreground-muted)]">{formatDate(alert.createdAt)}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <span className="text-[var(--foreground-muted)]">
                    Center: <strong className="text-[var(--foreground)]">{alert.centerName}</strong>
                    <span className="ml-1 text-xs">({alert.division})</span>
                  </span>
                  {alert.staffName && (
                    <span className="text-[var(--foreground-muted)]">
                      Staff: <strong className="text-[var(--foreground)]">{alert.staffName}</strong>
                    </span>
                  )}
                  {alert.userName && (
                    <span className="text-[var(--foreground-muted)]">
                      Citizen: <strong className="text-[var(--foreground)]">{alert.userName}</strong>
                      {maskNid(alert.userNid) && (
                        <span className="ml-1 font-mono text-xs text-[var(--foreground-muted)]">({maskNid(alert.userNid)})</span>
                      )}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--foreground-muted)]">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1 || isPending} onClick={() => load(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= pages || isPending} onClick={() => load(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <CaseInvestigationDrawer
        alertId={selectedId}
        onClose={() => setSelectedId(null)}
        onResolved={() => load(page)}
      />
    </>
  );
}
