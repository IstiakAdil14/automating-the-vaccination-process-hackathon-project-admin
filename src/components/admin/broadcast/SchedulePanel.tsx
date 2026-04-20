"use client";

import { useState } from "react";
import { Clock, Calendar, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScheduleConfig {
  mode:       "now" | "scheduled";
  sendAt?:    string;   // ISO datetime-local string
  recurring?: "DAILY" | "WEEKLY";
  weekDays?:  number[]; // 0=Sun - 6=Sat
}

interface Props {
  value:    ScheduleConfig;
  onChange: (v: ScheduleConfig) => void;
}

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// Min datetime: 15 minutes from now
function minDateTime(): string {
  const d = new Date(Date.now() + 15 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

// Format a datetime-local string as BST (UTC+6)
function formatBST(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const bst = new Date(d.getTime() + 6 * 3600 * 1000);
  return bst.toUTCString().replace("GMT", "BST (UTC+6)");
}

export function SchedulePanel({ value, onChange }: Props) {
  function setMode(mode: "now" | "scheduled") {
    onChange({ ...value, mode, sendAt: mode === "now" ? undefined : value.sendAt });
  }

  function toggleWeekDay(day: number) {
    const days = value.weekDays ?? [];
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    onChange({ ...value, weekDays: next });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm font-semibold text-[var(--foreground)]">Schedule</p>

      {/* Send Now vs Schedule */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { mode: "now",       label: "Send Now",  icon: Zap },
          { mode: "scheduled", label: "Schedule",  icon: Calendar },
        ] as const).map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => setMode(mode)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all",
              value.mode === mode
                ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]"
            )}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* Scheduled options */}
      {value.mode === "scheduled" && (
        <div className="space-y-4">
          {/* Datetime picker */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Send At *
            </label>
            <input
              type="datetime-local"
              value={value.sendAt ?? ""}
              min={minDateTime()}
              onChange={(e) => onChange({ ...value, sendAt: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
            {value.sendAt && (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--foreground-muted)]">
                <Clock className="h-3 w-3" />
                {formatBST(value.sendAt)}
              </p>
            )}
          </div>

          {/* Recurring toggle */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Recurring
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: undefined,  label: "One-time" },
                { value: "DAILY",    label: "Daily" },
                { value: "WEEKLY",   label: "Weekly" },
              ] as const).map(({ value: v, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange({ ...value, recurring: v, weekDays: v === "WEEKLY" ? (value.weekDays ?? []) : undefined })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    value.recurring === v
                      ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]"
                  )}
                >
                  {v && <RefreshCw className="h-3 w-3" />}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly day selector */}
          {value.recurring === "WEEKLY" && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                Repeat On
              </label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekDay(i)}
                    className={cn(
                      "h-8 w-8 rounded-full text-xs font-semibold transition-all",
                      (value.weekDays ?? []).includes(i)
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]"
                    )}
                  >
                    {day.slice(0, 1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timezone note */}
      <p className="flex items-center gap-1.5 text-[10px] text-[var(--foreground-muted)]">
        <Clock className="h-3 w-3" />
        All times in Bangladesh Standard Time (BST, UTC+6)
      </p>
    </div>
  );
}
