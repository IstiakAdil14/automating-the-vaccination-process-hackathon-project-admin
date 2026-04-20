"use client";

import { useState, useTransition } from "react";
import { Download, Loader2, MessageSquare, Mail, Bell, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { getDeliveryReport, type DeliveryReportData } from "@/app/actions/broadcast";

interface Props {
  broadcastId: string | null;
  onClose:     () => void;
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4 text-center">
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{typeof value === "number" ? formatNumber(value) : value}</p>
      <p className="mt-0.5 text-xs font-semibold text-[var(--foreground)]">{label}</p>
      {sub && <p className="text-[10px] text-[var(--foreground-muted)]">{sub}</p>}
    </div>
  );
}

export function DeliveryReport({ broadcastId, onClose }: Props) {
  const [report,    setReport]    = useState<DeliveryReportData | null>(null);
  const [error,     setError]     = useState("");
  const [isPending, startTransition] = useTransition();

  // Load when broadcastId changes
  useState(() => {
    if (!broadcastId) { setReport(null); return; }
    startTransition(async () => {
      const res = await getDeliveryReport(broadcastId);
      if (res.ok) setReport(res.data);
      else setError(res.error);
    });
  });

  function exportPDF() {
    if (!report) return;
    const lines = [
      `Delivery Report - ${report.title}`,
      `Broadcast ID: ${report.broadcastId}`,
      `Sent At: ${report.sentAt ? formatDate(report.sentAt) : "-"}`,
      "",
      `Total Sent:      ${report.totalSent}`,
      `Total Delivered: ${report.totalDelivered}`,
      `Total Failed:    ${report.totalFailed}`,
      "",
      "SMS:",
      `  Sent: ${report.sms.sent} | Delivered: ${report.sms.delivered} | Failed: ${report.sms.failed} | Bounce Rate: ${report.sms.bounceRate}%`,
      "",
      "Email:",
      `  Sent: ${report.email.sent} | Delivered: ${report.email.delivered} | Failed: ${report.email.failed} | Open Rate: ${report.email.openRate}%`,
      "",
      "In-App:",
      `  Sent: ${report.inApp.sent} | Delivered: ${report.inApp.delivered} | Failed: ${report.inApp.failed}`,
      "",
      "Failure Reasons:",
      ...report.failureReasons.map((f) => `  ${f.reason}: ${f.count}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `delivery-report-${report.broadcastId}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={!!broadcastId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Delivery Report</span>
            {report && (
              <Button size="sm" variant="outline" onClick={exportPDF} className="text-xs">
                <Download className="h-3.5 w-3.5" /> Export PDF
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
          {isPending && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
            </div>
          )}

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          {report && !isPending && (
            <div className="space-y-6">
              {/* Header info */}
              <div>
                <p className="text-base font-semibold text-[var(--foreground)]">{report.title}</p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {report.broadcastId} - {report.sentAt ? formatDate(report.sentAt) : "Not sent yet"}
                </p>
              </div>

              {/* Overall stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Total Sent"      value={report.totalSent}      color="var(--foreground)" />
                <StatCard label="Total Delivered" value={report.totalDelivered} color="var(--accent)" />
                <StatCard label="Total Failed"    value={report.totalFailed}    color={report.totalFailed > 0 ? "var(--danger)" : "var(--foreground-muted)"} />
              </div>

              {/* Per-channel */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">By Channel</p>

                {report.channels.includes("SMS") && (
                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
                      <p className="text-sm font-semibold text-[var(--foreground)]">SMS</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <StatCard label="Sent"       value={report.sms.sent} />
                      <StatCard label="Delivered"  value={report.sms.delivered} color="var(--accent)" />
                      <StatCard label="Failed"     value={report.sms.failed}    color={report.sms.failed > 0 ? "var(--danger)" : undefined} />
                      <StatCard label="Bounce Rate" value={`${report.sms.bounceRate}%`} color={report.sms.bounceRate > 5 ? "var(--warning)" : "var(--foreground-muted)"} />
                    </div>
                  </div>
                )}

                {report.channels.includes("EMAIL") && (
                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[var(--info)]" />
                      <p className="text-sm font-semibold text-[var(--foreground)]">Email</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <StatCard label="Sent"       value={report.email.sent} />
                      <StatCard label="Delivered"  value={report.email.delivered} color="var(--accent)" />
                      <StatCard label="Failed"     value={report.email.failed}    color={report.email.failed > 0 ? "var(--danger)" : undefined} />
                      <StatCard label="Open Rate"  value={`${report.email.openRate}%`} color="var(--info)" />
                    </div>
                  </div>
                )}

                {report.channels.includes("IN_APP") && (
                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Bell className="h-4 w-4 text-[var(--warning)]" />
                      <p className="text-sm font-semibold text-[var(--foreground)]">In-App</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <StatCard label="Sent"      value={report.inApp.sent} />
                      <StatCard label="Delivered" value={report.inApp.delivered} color="var(--accent)" />
                      <StatCard label="Failed"    value={report.inApp.failed}    color={report.inApp.failed > 0 ? "var(--danger)" : undefined} />
                    </div>
                  </div>
                )}
              </div>

              {/* Failure reasons */}
              {report.failureReasons.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]">Failure Reasons</p>
                  <div className="space-y-2">
                    {report.failureReasons.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-3.5 w-3.5 text-[var(--danger)]" />
                          <p className="text-sm text-[var(--foreground)]">{f.reason}</p>
                        </div>
                        <span className="font-mono text-sm font-bold text-[var(--danger)]">{f.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.totalFailed === 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                  <p className="text-sm font-semibold text-[var(--accent)]">100% delivery - no failures</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
