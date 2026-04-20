"use client";

import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VACCINE_OPTIONS, AGE_GROUP_OPTIONS, GENDER_OPTIONS,
  type HeatmapFilters,
} from "@/types/heatmap";

interface FilterPanelProps {
  filters:   HeatmapFilters;
  onChange:  (f: HeatmapFilters) => void;
  loading:   boolean;
}

function PillGroup<T extends string>({
  options, value, onChange,
}: {
  options: readonly { value: T; label: string }[];
  value:   T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
            value === o.value
              ? "bg-[var(--health-green-500)] text-white shadow-sm"
              : "bg-[var(--background-subtle)] text-[var(--foreground-muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FilterPanel({ filters, onChange, loading }: FilterPanelProps) {
  const today = new Date().toISOString().slice(0, 10);

  function set<K extends keyof HeatmapFilters>(key: K, val: HeatmapFilters[K]) {
    onChange({ ...filters, [key]: val });
  }

  function handleDateFrom(val: string) {
    const next: HeatmapFilters = { ...filters, dateFrom: val || undefined };
    // if new "from" is after existing "to", clear "to"
    if (val && filters.dateTo && val > filters.dateTo) next.dateTo = undefined;
    onChange(next);
  }

  function handleDateTo(val: string) {
    const next: HeatmapFilters = { ...filters, dateTo: val || undefined };
    // if new "to" is before existing "from", clear "from"
    if (val && filters.dateFrom && val < filters.dateFrom) next.dateFrom = undefined;
    onChange(next);
  }

  const dateError =
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo
      ? "From date must be before To date"
      : filters.dateFrom && filters.dateFrom > today
      ? "From date cannot be in the future"
      : null;

  const hasActive =
    (filters.vaccineId && filters.vaccineId !== "all") ||
    (filters.ageGroup  && filters.ageGroup  !== "all") ||
    (filters.gender    && filters.gender    !== "all") ||
    filters.dateFrom || filters.dateTo;

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
          Filters
        </span>
        {hasActive && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--health-green-500)] text-[10px] font-bold text-white">
            !
          </span>
        )}
      </div>

      {/* Vaccine type */}
      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
          Vaccine Type
        </label>
        <PillGroup
          options={VACCINE_OPTIONS}
          value={(filters.vaccineId ?? "all") as typeof VACCINE_OPTIONS[number]["value"]}
          onChange={(v) => set("vaccineId", v)}
        />
      </div>

      {/* Age group */}
      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
          Age Group
        </label>
        <PillGroup
          options={AGE_GROUP_OPTIONS}
          value={(filters.ageGroup ?? "all") as typeof AGE_GROUP_OPTIONS[number]["value"]}
          onChange={(v) => set("ageGroup", v as HeatmapFilters["ageGroup"])}
        />
      </div>

      {/* Gender */}
      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
          Gender
        </label>
        <PillGroup
          options={GENDER_OPTIONS}
          value={(filters.gender ?? "all") as typeof GENDER_OPTIONS[number]["value"]}
          onChange={(v) => set("gender", v as HeatmapFilters["gender"])}
        />
      </div>

      {/* Date range */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              From
            </label>
            <input
              type="date"
              value={filters.dateFrom ?? ""}
              max={filters.dateTo ?? today}
              onChange={(e) => handleDateFrom(e.target.value)}
              className={cn(
                "w-full rounded-lg border bg-[var(--background-subtle)] px-2 py-1.5 text-xs text-[var(--foreground)] focus:outline-none",
                dateError
                  ? "border-[var(--danger)] focus:border-[var(--danger)]"
                  : "border-[var(--border)] focus:border-[var(--health-green-500)]"
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              To
            </label>
            <input
              type="date"
              value={filters.dateTo ?? ""}
              min={filters.dateFrom ?? undefined}
              max={today}
              onChange={(e) => handleDateTo(e.target.value)}
              className={cn(
                "w-full rounded-lg border bg-[var(--background-subtle)] px-2 py-1.5 text-xs text-[var(--foreground)] focus:outline-none",
                dateError
                  ? "border-[var(--danger)] focus:border-[var(--danger)]"
                  : "border-[var(--border)] focus:border-[var(--health-green-500)]"
              )}
            />
          </div>
        </div>
        {dateError && (
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--danger)]">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {dateError}
          </div>
        )}
      </div>

      {/* Reset */}
      {hasActive && (
        <button
          onClick={() => onChange({ vaccineId: "all", ageGroup: "all", gender: "all" })}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-1.5 text-xs text-[var(--foreground-muted)] hover:border-[var(--danger)] hover:text-[var(--danger)] transition-colors"
        >
          <X className="h-3 w-3" /> Reset filters
        </button>
      )}
    </div>
  );
}
