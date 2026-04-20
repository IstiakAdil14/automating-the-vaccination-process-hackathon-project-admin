"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Shield, User, MapPin, Clock, FileText, AlertTriangle,
  CheckCircle2, XCircle, HelpCircle, Loader2, ChevronRight,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import { getCaseDetail, resolveCase, type CaseDetail, type ResolutionAction } from "@/app/actions/fraud";

const TYPE_LABELS: Record<string, string> = {
  DUPLICATE_NID:  "Duplicate NID",
  TAMPERED_QR:    "Tampered QR",
  MULTI_LOCATION: "Multi-Location",
  INVALID_BATCH:  "Invalid Batch",
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-[var(--danger-subtle)] text-[var(--danger)] border-[var(--danger)]",
  HIGH:     "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300",
  MEDIUM:   "bg-[var(--info-subtle)] text-[var(--info)] border-[var(--info)]",
  LOW:      "bg-[var(--background-subtle)] text-[var(--foreground-muted)] border-[var(--border)]",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN:           "bg-[var(--danger-subtle)] text-[var(--danger)]",
  INVESTIGATING:  "bg-[var(--warning-subtle)] text-[var(--warning)]",
  RESOLVED:       "bg-[var(--accent-subtle)] text-[var(--accent)]",
  FALSE_POSITIVE: "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
};

function maskNid(nid?: string) {
  if (!nid) return "-";
  return "XXXX-XXXX-" + nid.slice(-4);
}

interface ResolutionPanelProps {
  alertId:  string;
  onDone:   () => void;
}
function ResolutionPanel({ alertId, onDone }: ResolutionPanelProps) {
  const [action,      setAction]      = useState<ResolutionAction | null>(null);
  const [note,        setNote]        = useState("");
  const [followUp,    setFollowUp]    = useState("");
  const [error,       setError]       = useState("");
  const [isPending,   startTransition] = useTransition();

  const ACTIONS: { value: ResolutionAction; label: string; icon: React.ElementType; color: string; desc: string }[] = [
    { value: "FALSE_POSITIVE",  label: "False Positive",    icon: XCircle,      color: "var(--foreground-muted)", desc: "Close case - no action required" },
    { value: "CONFIRMED_FRAUD", label: "Confirmed Fraud",   icon: AlertTriangle, color: "var(--danger)",          desc: "Block citizen, flag staff, alert center" },
    { value: "INCONCLUSIVE",    label: "Inconclusive",      icon: HelpCircle,   color: "var(--warning)",          desc: "Mark for further review with follow-up date" },
  ];

  function submit() {
    if (!action) { setError("Select a resolution"); return; }
    if (note.trim().length < 10) { setError("Note must be at least 10 characters"); return; }
    setError("");
    startTransition(async () => {
      const res = await resolveCase(alertId, action, note, followUp || undefined);
      if (!res.ok) { setError(res.error); return; }
      onDone();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Resolution</p>

      <div className="grid grid-cols-1 gap-2">
        {ACTIONS.map(({ value, label, icon: Icon, color, desc }) => (
          <button
            key={value}
            type="button"
            onClick={() => setAction(value)}
            className={cn(
              "flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all",
              action === value
                ? "border-current bg-[var(--background-subtle)]"
                : "border-[var(--border)] hover:border-[var(--foreground-muted)]"
            )}
            style={action === value ? { borderColor: color, color } : undefined}
          >
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color }} />
            <div>
              <p className="text-sm font-semibold" style={{ color }}>{label}</p>
              <p className="text-xs text-[var(--foreground-muted)]">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {action === "INCONCLUSIVE" && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Follow-up Date</label>
          <input
            type="date"
            value={followUp}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setFollowUp(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Admin Note *</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Describe your resolution decision (min 10 characters)-"
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <Button
        onClick={submit}
        disabled={isPending || !action}
        className={cn(
          "w-full text-white hover:opacity-90",
          action === "CONFIRMED_FRAUD" ? "bg-[var(--danger)]" :
          action === "FALSE_POSITIVE"  ? "bg-[var(--foreground-muted)]" :
          "bg-[var(--warning)]"
        )}
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Confirm Resolution
      </Button>
    </div>
  );
}

interface Props {
  alertId: string | null;
  onClose: () => void;
  onResolved: () => void;
}

export function CaseInvestigationDrawer({ alertId, onClose, onResolved }: Props) {
  const [detail,    setDetail]    = useState<CaseDetail | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [, startTransition]       = useTransition();

  useEffect(() => {
    if (!alertId) { setDetail(null); return; }
    setLoading(true);
    startTransition(async () => {
      const res = await getCaseDetail(alertId);
      if (res.ok) setDetail(res.data);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId]);

  const isResolved = detail?.status === "RESOLVED" || detail?.status === "FALSE_POSITIVE";

  return (
    <Sheet open={!!alertId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full max-w-2xl flex-col p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-[var(--border)] px-6 py-4">
          {loading || !detail ? (
            <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div>
          ) : (
            <div className="flex items-start justify-between pr-8">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[var(--danger)]" />
                  {TYPE_LABELS[detail.type] ?? detail.type}
                </SheetTitle>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">{detail.alertId}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold", SEVERITY_STYLES[detail.severity])}>
                  {detail.severity}
                </span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[detail.status])}>
                  {detail.status}
                </span>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : detail ? (
            <Tabs defaultValue="overview" className="h-full">
              <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-6 pt-3">
                <TabsList className="h-auto w-full flex-wrap gap-1 bg-transparent p-0">
                  {[
                    { value: "overview",  label: "Overview",  icon: Shield },
                    { value: "citizen",   label: "Citizen",   icon: User },
                    { value: "evidence",  label: "Evidence",  icon: FileText },
                    { value: "context",   label: "Center Context", icon: MapPin },
                  ].map(({ value, label, icon: Icon }) => (
                    <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 text-xs data-[state=active]:bg-[var(--background-subtle)]">
                      <Icon className="h-3.5 w-3.5" />{label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* -- Overview -- */}
              <TabsContent value="overview" className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Alert Type",  value: TYPE_LABELS[detail.type] ?? detail.type },
                    { label: "Triggered",   value: formatDate(detail.createdAt) },
                    { label: "Center",      value: detail.centerName },
                    { label: "Division",    value: detail.division },
                    { label: "Staff",       value: detail.staffName ?? "-" },
                    { label: "Status",      value: detail.status },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-[var(--border)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{label}</p>
                      <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{value}</p>
                    </div>
                  ))}
                </div>
                {detail.resolution && (
                  <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Resolution</p>
                    <p className="text-sm text-[var(--foreground)]">{detail.resolution}</p>
                    {detail.resolvedAt && (
                      <p className="mt-1 text-xs text-[var(--foreground-muted)]">Resolved {formatDate(detail.resolvedAt)}</p>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* -- Citizen -- */}
              <TabsContent value="citizen" className="space-y-4 p-6">
                {detail.userId ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Name",    value: detail.userName ?? "-" },
                        { label: "NID",     value: maskNid(detail.userNid) },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-[var(--border)] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{label}</p>
                          <p className="mt-1 font-mono text-sm font-medium text-[var(--foreground)]">{value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--foreground-muted)]">Full vaccination history available in the Citizen Management panel.</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--foreground-muted)]">No citizen linked to this alert.</p>
                )}
              </TabsContent>

              {/* -- Evidence -- */}
              <TabsContent value="evidence" className="p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Evidence Trail</p>
                <div className="space-y-3">
                  {/* Alert creation event */}
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--danger)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">Alert triggered: {TYPE_LABELS[detail.type]}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">{formatDate(detail.createdAt)}</p>
                    </div>
                  </div>
                  {/* Raw details */}
                  {Object.entries(detail.details).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-3">
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--foreground-muted)]" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{k}</p>
                        <p className="text-sm text-[var(--foreground)]">{String(v)}</p>
                      </div>
                    </div>
                  ))}
                  {detail.resolution && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Case resolved</p>
                        <p className="text-xs text-[var(--foreground-muted)]">{detail.resolvedAt ? formatDate(detail.resolvedAt) : "-"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* -- Center Context -- */}
              <TabsContent value="context" className="p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                  Other Flags from {detail.centerName} (Last 30 Days)
                </p>
                {detail.centerFlags.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] p-4">
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                    <p className="text-sm text-[var(--accent)]">No other flags from this center</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detail.centerFlags.map((f) => (
                      <div key={f._id} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">{TYPE_LABELS[f.type] ?? f.type}</p>
                          <p className="text-xs text-[var(--foreground-muted)]">{formatDate(f.createdAt)}</p>
                        </div>
                        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold", SEVERITY_STYLES[f.severity])}>
                          {f.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </div>

        {/* Resolution panel */}
        {detail && !isResolved && (
          <div className="border-t border-[var(--border)] bg-[var(--surface)] p-6">
            <ResolutionPanel
              alertId={detail._id}
              onDone={() => { onResolved(); onClose(); }}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
