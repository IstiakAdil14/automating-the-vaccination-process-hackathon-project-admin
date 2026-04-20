"use client";

import { useState, useTransition, useEffect } from "react";
import { Plus, Pause, Play, Trash2, Loader2, Clock, Mail, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import {
  scheduleReport, getScheduledReports, toggleSchedule, deleteSchedule,
  type ScheduledReportRow,
} from "@/app/actions/reports";

const TEMPLATES = [
  { key: "WEEKLY_PROGRESS",  label: "Weekly National Progress Report" },
  { key: "COVERAGE_SUMMARY", label: "Monthly Coverage Summary" },
  { key: "SUPPLY_STATUS",    label: "Supply Chain Status Report" },
  { key: "STAFF_PERFORMANCE",label: "Staff Performance Digest" },
  { key: "FRAUD_SUMMARY",    label: "Fraud Summary Report" },
  { key: "WASTAGE_REPORT",   label: "Vaccine Wastage Report" },
];

const FREQ_LABELS: Record<string, string> = {
  DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly",
};

export function ScheduledReports() {
  const [schedules,  setSchedules]  = useState<ScheduledReportRow[]>([]);
  const [showForm,   setShowForm]   = useState(false);
  const [template,   setTemplate]   = useState("");
  const [frequency,  setFrequency]  = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [emailInput, setEmailInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [isPending,  startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const res = await getScheduledReports();
      if (res.ok) setSchedules(res.data);
    });
  }

  useEffect(() => { load(); }, []);

  function addEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!email.includes("@")) { setError("Invalid email address"); return; }
    if (recipients.includes(email)) { setError("Already added"); return; }
    setRecipients((prev) => [...prev, email]);
    setEmailInput("");
    setError("");
  }

  function handleCreate() {
    if (!template)              { setError("Select a template"); return; }
    if (recipients.length === 0){ setError("Add at least one recipient"); return; }
    setError("");

    startTransition(async () => {
      const tplLabel = TEMPLATES.find((t) => t.key === template)?.label ?? template;
      const res = await scheduleReport({
        templateKey: template,
        title:       tplLabel,
        frequency,
        recipients,
      });

      if (res.ok) {
        setSuccess("Schedule created successfully!");
        setShowForm(false);
        setTemplate(""); setFrequency("WEEKLY"); setRecipients([]);
        load();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(res.error);
      }
    });
  }

  function handleToggle(scheduleId: string, isActive: boolean) {
    startTransition(async () => {
      await toggleSchedule(scheduleId, !isActive);
      load();
    });
  }

  function handleDelete(scheduleId: string) {
    startTransition(async () => {
      await deleteSchedule(scheduleId);
      load();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--foreground-muted)]">
          {schedules.length} scheduled report{schedules.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="bg-[var(--accent)] text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> New Schedule
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] px-4 py-3 text-sm font-medium text-[var(--accent)]">
          <CheckCircle2 className="h-4 w-4" />{success}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] p-5 space-y-4">
          <p className="text-sm font-semibold text-[var(--foreground)]">New Scheduled Report</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Template *</label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger><SelectValue placeholder="Select template-" /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Frequency *</label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Email Recipients *</label>
            <div className="flex gap-2">
              <Input
                placeholder="admin@health.gov.bd"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEmail()}
                className="flex-1"
              />
              <Button size="sm" variant="outline" onClick={addEmail}>Add</Button>
            </div>
            {recipients.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {recipients.map((email) => (
                  <span key={email} className="flex items-center gap-1 rounded-full bg-[var(--background-subtle)] px-3 py-1 text-xs">
                    <Mail className="h-3 w-3 text-[var(--foreground-muted)]" />
                    {email}
                    <button onClick={() => setRecipients((prev) => prev.filter((e) => e !== email))}>
                      <X className="h-3 w-3 text-[var(--foreground-muted)] hover:text-[var(--danger)]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={isPending} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={isPending} className="flex-1 bg-[var(--accent)] text-white hover:opacity-90">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create Schedule
            </Button>
          </div>
        </div>
      )}

      {/* Schedules list */}
      {schedules.length === 0 && !isPending ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border)] py-16">
          <Clock className="h-8 w-8 text-[var(--foreground-muted)]" />
          <p className="text-sm text-[var(--foreground-muted)]">No scheduled reports yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                {["Template","Frequency","Recipients","Next Run","Last Run","Status","Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {schedules.map((s) => (
                <tr key={s._id} className="hover:bg-[var(--background-subtle)]">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-[var(--foreground)]">{s.title}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{s.scheduleId}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-full bg-[var(--background-subtle)] px-2.5 py-0.5 text-xs font-semibold">
                      {FREQ_LABELS[s.frequency]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      {s.recipients.slice(0, 2).map((r) => (
                        <p key={r} className="text-xs text-[var(--foreground-muted)]">{r}</p>
                      ))}
                      {s.recipients.length > 2 && (
                        <p className="text-xs text-[var(--foreground-muted)]">+{s.recipients.length - 2} more</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[var(--foreground-muted)]">
                    {s.nextRunAt ? formatDate(s.nextRunAt) : "-"}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[var(--foreground-muted)]">
                    {s.lastRunAt ? formatDate(s.lastRunAt) : "Never"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      s.isActive
                        ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                        : "bg-[var(--background-subtle)] text-[var(--foreground-muted)]"
                    )}>
                      {s.isActive ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => handleToggle(s.scheduleId, s.isActive)}
                        disabled={isPending}
                        className={cn("h-7 px-2 text-xs", s.isActive ? "text-[var(--warning)]" : "text-[var(--accent)]")}
                      >
                        {s.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => handleDelete(s.scheduleId)}
                        disabled={isPending}
                        className="h-7 px-2 text-xs text-[var(--danger)] hover:bg-[var(--danger-subtle)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
