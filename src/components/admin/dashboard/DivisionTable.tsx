"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpDown, ArrowUp, ArrowDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DivisionBreakdownRow } from "@/services/adminStatsService";
import { Skeleton } from "@/components/ui/skeleton";

/* --- Progress bar ------------------------------------------------------------- */
function CoverageBar({ pct }: { pct: number }) {
  const color =
    pct >= 70 ? "var(--health-green-500)" :
    pct >= 40 ? "var(--amber-500)"        :
                "var(--red-500)";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--background-subtle)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span
        className="w-10 text-right text-xs font-semibold tabular-nums"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  );
}

/* --- Sort types --------------------------------------------------------------- */
type SortKey = keyof DivisionBreakdownRow;
type SortDir = "asc" | "desc";

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return dir === "asc"
    ? <ArrowUp   className="h-3 w-3 text-[var(--health-green-500)]" />
    : <ArrowDown className="h-3 w-3 text-[var(--health-green-500)]" />;
}

/* --- Table -------------------------------------------------------------------- */
interface DivisionTableProps {
  data: DivisionBreakdownRow[];
}

const COLS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "division",          label: "Division" },
  { key: "totalVaccinations", label: "Doses",          align: "right" },
  { key: "totalCitizens",     label: "Population",     align: "right" },
  { key: "coveragePercent",   label: "Coverage" },
  { key: "activeCenters",     label: "Active Centers", align: "right" },
];

export function DivisionCoverageTable({ data }: DivisionTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("totalVaccinations");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = useMemo(() => {
    return [...data]
      .filter((row) => row.division != null)
      .sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
        <MapPin className="h-4 w-4 text-[var(--blue-500)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">
          Division Coverage Breakdown
        </span>
        <span className="ml-auto rounded-full bg-[var(--background-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground-muted)]">
          {data.length} divisions
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {COLS.map(({ key, label, align }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={cn(
                    "cursor-pointer select-none px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]",
                    align === "right" ? "text-right" : "text-left"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {label}
                    <SortIcon col={key} active={sortKey === key} dir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sorted.map((row, i) => (
              <motion.tr
                key={row.division}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => router.push(`/heatmap?division=${encodeURIComponent(row.division ?? "")}`)}
                className="group cursor-pointer transition-colors hover:bg-[var(--background-subtle)]"
              >
                {/* Division name */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--background-subtle)] text-xs font-bold text-[var(--foreground-muted)] group-hover:bg-[var(--accent-subtle)] group-hover:text-[var(--accent)]">
                      {(row.division ?? "???").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-[var(--foreground)]">{row.division ?? "Unknown"}</span>
                  </div>
                </td>

                {/* Doses */}
                <td className="px-5 py-3.5 text-right font-mono text-xs text-[var(--foreground)]">
                  {new Intl.NumberFormat("en-US").format(row.totalVaccinations)}
                </td>

                {/* Population */}
                <td className="px-5 py-3.5 text-right font-mono text-xs text-[var(--foreground-muted)]">
                  {new Intl.NumberFormat("en-US").format(row.totalCitizens)}
                </td>

                {/* Coverage bar */}
                <td className="min-w-[160px] px-5 py-3.5">
                  <CoverageBar pct={row.coveragePercent} />
                </td>

                {/* Active centers */}
                <td className="px-5 py-3.5 text-right">
                  <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                    {row.activeCenters}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- Skeleton ----------------------------------------------------------------- */
export function DivisionTableSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <Skeleton className="mb-4 h-5 w-48" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-2 w-32 rounded-full" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
