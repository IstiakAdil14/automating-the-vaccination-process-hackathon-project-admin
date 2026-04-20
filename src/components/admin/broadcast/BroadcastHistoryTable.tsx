"use client";

import { useState, useTransition, useEffect } from "react";
import { RefreshCw, BarChart2, Loader2, ChevronLeft, ChevronRight, MessageSquare, Mail, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { getBroadcastHistory, type BroadcastHistoryRow, type BroadcastPayload } from "@/app/actions/broadcast";
import { DeliveryReport } from "./DeliveryReport";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
  SCHEDULED: "bg-[var(--info-subtle)] text-[var(--info)]",
  SENDING:   "bg-[var(--warning-subtle)] text-[var(--warning)]",
  SENT:      "bg-[var(--accent-subtle)] text-[var(--accent)]",
  FAILED:    "bg-[var(--danger-subtle)] text-[var(--danger)]",
};

import type { ElementType } from "react";

const CHANNEL_ICONS: Record<string, ElementType> = {
  SMS:    MessageSquare,
  EMAIL:  Mail,
  IN_APP: Bell,
};

interface Props {
  onResend?: (payload: Partial<BroadcastPayload>) => void;
}

export function BroadcastHistoryTable({ onResend }: Props) {
  const [data,       setData]       = useState<BroadcastHistoryRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [page,       setPage]       = useState(1);
  const [reportId,   setReportId]   = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();

  function load(p: number) {
    startTransition(async () => {
      const res = await getBroadcastHistory(p, 20);
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
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--foreground-muted)]">
            {isPending ? "Loading-" : `${formatNumber(total)} broadcast${total !== 1 ? "s" : ""}`}
          </span>
          <Button size="sm" variant="outline" onClick={() => load(page)} disabled={isPending} className="text-xs">
            <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} /> Refresh
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                  {["Title","Audience","Channels","Status","Sent At","Delivery Stats","Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isPending && data.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--accent)]" />
                  </td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-sm text-[var(--foreground-muted)]">
                    No broadcasts yet
                  </td></tr>
                ) : data.map((row) => (
                  <tr key={row._id} className="hover:bg-[var(--background-subtle)]">
                    {/* Title */}
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="truncate font-medium text-[var(--foreground)]">{row.title}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">{row.broadcastId}</p>
                    </td>

                    {/* Audience */}
                    <td className="px-4 py-3.5 max-w-[160px]">
                      <p className="truncate text-xs text-[var(--foreground-muted)]">{row.audienceSummary}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">~{formatNumber(row.estimatedRecipients)}</p>
                    </td>

                    {/* Channels */}
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1">
                        {row.channels.map((ch) => {
                          const Icon = CHANNEL_ICONS[ch];
                          return Icon ? <Icon key={ch} className="h-4 w-4 text-[var(--foreground-muted)]" /> : null;
                        })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[row.status] ?? "")}>
                        {row.status}
                      </span>
                    </td>

                    {/* Sent At */}
                    <td className="px-4 py-3.5 text-xs text-[var(--foreground-muted)]">
                      {row.sentAt ? formatDate(row.sentAt) : row.scheduledAt ? `Scheduled: ${formatDate(row.scheduledAt)}` : "-"}
                    </td>

                    {/* Delivery stats */}
                    <td className="px-4 py-3.5">
                      {row.status === "SENT" ? (
                        <div className="space-y-0.5 text-xs">
                          <p className="text-[var(--foreground-muted)]">
                            Sent: <strong className="text-[var(--foreground)]">{formatNumber(row.deliveryStats.sms.sent + row.deliveryStats.email.sent + row.deliveryStats.inApp.sent)}</strong>
                          </p>
                          <p className="text-[var(--foreground-muted)]">
                            Delivered: <strong className="text-[var(--accent)]">{formatNumber(row.deliveryStats.sms.delivered + row.deliveryStats.email.delivered + row.deliveryStats.inApp.delivered)}</strong>
                          </p>
                          {(row.deliveryStats.sms.failed + row.deliveryStats.email.failed + row.deliveryStats.inApp.failed) > 0 && (
                            <p className="text-[var(--foreground-muted)]">
                              Failed: <strong className="text-[var(--danger)]">{formatNumber(row.deliveryStats.sms.failed + row.deliveryStats.email.failed + row.deliveryStats.inApp.failed)}</strong>
                            </p>
                          )}
                          {row.deliveryStats.email.opened > 0 && (
                            <p className="text-[var(--foreground-muted)]">
                              Opened: <strong className="text-[var(--info)]">{formatNumber(row.deliveryStats.email.opened)}</strong>
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--foreground-muted)]">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1">
                        {row.status === "SENT" && (
                          <Button size="sm" variant="ghost" onClick={() => setReportId(row.broadcastId)} className="h-7 px-2 text-xs">
                            <BarChart2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onResend && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => onResend({ title: `[Re-send] ${row.title}`, channels: row.channels })}
                            className="h-7 px-2 text-xs text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
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
      </div>

      <DeliveryReport broadcastId={reportId} onClose={() => setReportId(null)} />
    </>
  );
}
