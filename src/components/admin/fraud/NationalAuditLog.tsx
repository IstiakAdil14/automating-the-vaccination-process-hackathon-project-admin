"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { Search, Download, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { searchAuditLog, exportAudit, type AuditEntry } from "@/app/actions/fraud";

const ACTION_STYLES: Record<AuditEntry["actionType"], string> = {
  CREATE:  "bg-[var(--accent-subtle)] text-[var(--accent)]",
  VIEW:    "bg-[var(--info-subtle)] text-[var(--info)]",
  EDIT:    "bg-[var(--warning-subtle)] text-[var(--warning)]",
  DELETE:  "bg-[var(--danger-subtle)] text-[var(--danger)]",
  EXPORT:  "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  LOGIN:   "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
  SUSPEND: "bg-[var(--danger-subtle)] text-[var(--danger)]",
  RESOLVE: "bg-[var(--accent-subtle)] text-[var(--accent)]",
};

const PAGE_SIZE = 50;

function useDebounce<T>(value: T, delay = 400): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

export function NationalAuditLog() {
  const [entries,    setEntries]    = useState<AuditEntry[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(false);
  const [query,      setQuery]      = useState("");
  const [actionType, setActionType] = useState("all");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [isPending,  startTransition] = useTransition();
  const [exporting,  setExporting]  = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query);

  const load = useCallback((p: number, append = false) => {
    startTransition(async () => {
      const res = await searchAuditLog({
        query:      debouncedQuery || undefined,
        actionType: actionType !== "all" ? actionType : undefined,
        dateFrom:   dateFrom || undefined,
        dateTo:     dateTo   || undefined,
        page: p, limit: PAGE_SIZE,
      });
      if (res.ok) {
        setEntries((prev) => append ? [...prev, ...res.data.data] : res.data.data);
        setTotal(res.data.total);
        setHasMore(p < res.data.pages);
        setPage(p);
      }
    });
  }, [debouncedQuery, actionType, dateFrom, dateTo]);

  // Reset on filter change
  useEffect(() => { load(1, false); }, [load]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting && hasMore && !isPending) load(page + 1, true); },
      { threshold: 0.1 }
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, isPending, load, page]);

  async function handleExport(format: "csv" | "pdf") {
    setExporting(true);
    const res = await exportAudit({
      query:      debouncedQuery || undefined,
      actionType: actionType !== "all" ? actionType : undefined,
      dateFrom:   dateFrom || undefined,
      dateTo:     dateTo   || undefined,
    }, format);
    setExporting(false);
    if (!res.ok) return;
    const blob = new Blob([res.data.content], { type: format === "csv" ? "text/csv" : "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = res.data.filename; a.click();
    URL.revokeObjectURL(url);
  }

  const hasFilters = query || actionType !== "all" || dateFrom || dateTo;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <Input
            placeholder="Search user, record ID, IP-"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {(["CREATE","VIEW","EDIT","DELETE","EXPORT","LOGIN","SUSPEND","RESOLVE"] as AuditEntry["actionType"][]).map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
        <span className="text-xs text-[var(--foreground-muted)]">to</span>
        <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />

        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={() => { setQuery(""); setActionType("all"); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-[var(--foreground-muted)]">
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExport("csv")} disabled={exporting} className="text-xs">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("pdf")} disabled={exporting} className="text-xs">
            PDF
          </Button>
        </div>
      </div>

      <span className="text-xs text-[var(--foreground-muted)]">
        {isPending && entries.length === 0 ? "Loading-" : `${total.toLocaleString()} events`}
      </span>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                {["Timestamp","User","Role","Action","Resource","Record ID","IP Address"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {entries.length === 0 && !isPending ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-[var(--foreground-muted)]">No audit events found</td></tr>
              ) : entries.map((e) => (
                <tr key={e._id} className="hover:bg-[var(--background-subtle)]">
                  <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] tabular-nums">
                    {new Date(e.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[var(--foreground)]">{e.userName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--foreground-muted)]">{e.userRole.replace("_"," ")}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", ACTION_STYLES[e.actionType as AuditEntry["actionType"]])}>
                      {e.actionType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--foreground-muted)]">{e.resource}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--foreground-muted)]">{e.resourceId}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--foreground-muted)]">{e.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={loaderRef} className="flex items-center justify-center py-4">
          {isPending && entries.length > 0 && <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />}
          {!hasMore && entries.length > 0 && (
            <p className="text-xs text-[var(--foreground-muted)]">All {total.toLocaleString()} events loaded</p>
          )}
        </div>
      </div>
    </div>
  );
}
