"use client";

import { useState, useTransition, useEffect } from "react";
import { FileText, Download, Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { getReportHistory, type ReportHistoryRow } from "@/app/actions/reports";

const STATUS_STYLES: Record<string, string> = {
  PENDING:    "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
  GENERATING: "bg-[var(--warning-subtle)] text-[var(--warning)]",
  READY:      "bg-[var(--accent-subtle)] text-[var(--accent)]",
  FAILED:     "bg-[var(--danger-subtle)] text-[var(--danger)]",
};

const FORMAT_COLORS: Record<string, string> = {
  PDF:  "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  CSV:  "bg-[var(--accent-subtle)] text-[var(--accent)]",
  XLSX: "bg-[var(--info-subtle)] text-[var(--info)]",
  JSON: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
};

function formatBytes(bytes?: number): string {
  if (!bytes) return "-";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReportPreview() {
  const [data,       setData]       = useState<ReportHistoryRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [pages,      setPages]      = useState(1);
  const [isPending,  startTransition] = useTransition();

  function load(p: number) {
    startTransition(async () => {
      const res = await getReportHistory(p, 20);
      if (res.ok) {
        setData(res.data.data);
        setTotal(res.data.total);
        setPages(res.data.pages);
        setPage(p);
      }
    });
  }

  useEffect(() => { load(1); }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--foreground-muted)]">
          {isPending ? "Loading-" : `${formatNumber(total)} report${total !== 1 ? "s" : ""} generated`}
        </p>
        <Button size="sm" variant="outline" onClick={() => load(page)} disabled={isPending} className="text-xs">
          <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} /> Refresh
        </Button>
      </div>

      {data.length === 0 && !isPending ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border)] py-16">
          <FileText className="h-8 w-8 text-[var(--foreground-muted)]" />
          <p className="text-sm text-[var(--foreground-muted)]">No reports generated yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                  {["Report","Type","Format","Size","Status","Generated","Download"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isPending && data.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--accent)]" />
                  </td></tr>
                ) : data.map((row) => (
                  <tr key={row._id} className="hover:bg-[var(--background-subtle)]">
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="truncate font-medium text-[var(--foreground)]">{row.title}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">{row.reportId}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--foreground-muted)]">{row.type.replace("_"," ")}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", FORMAT_COLORS[row.format] ?? "")}>
                        {row.format}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--foreground-muted)]">{formatBytes(row.fileSize)}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold w-fit", STATUS_STYLES[row.status] ?? "")}>
                        {row.status === "READY"      && <CheckCircle2 className="h-3 w-3" />}
                        {row.status === "FAILED"     && <XCircle className="h-3 w-3" />}
                        {row.status === "GENERATING" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {row.status === "PENDING"    && <Clock className="h-3 w-3" />}
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--foreground-muted)]">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      {row.fileUrl ? (
                        <a href={row.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[var(--accent)] hover:bg-[var(--accent-subtle)]">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      ) : row.status === "FAILED" ? (
                        <span className="text-xs text-[var(--danger)]">{row.errorMsg?.slice(0, 30) ?? "Failed"}</span>
                      ) : (
                        <span className="text-xs text-[var(--foreground-muted)]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
              <span className="text-xs text-[var(--foreground-muted)]">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1 || isPending} onClick={() => load(page - 1)}>-</Button>
                <Button size="sm" variant="outline" disabled={page >= pages || isPending} onClick={() => load(page + 1)}>-</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
