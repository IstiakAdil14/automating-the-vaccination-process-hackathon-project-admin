"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { BarChart2, X, Plus, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatNumber } from "@/lib/utils";
import type { Center } from "@/types";

const COLORS = ["#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6"];
const MAX_CENTERS = 5;

interface CenterStats {
  center:            Center;
  avgDosesPerDay:    number;
  capacityPct:       number;
  fraudFlags:        number;
  inventoryWaste:    number;
}

async function fetchCenterStats(id: string): Promise<CenterStats | null> {
  const res = await fetch(`/api/admin/centers/${id}`);
  if (!res.ok) return null;
  const { center, trend, fraudCount } = await res.json();
  const avgDosesPerDay = trend.length
    ? Math.round(trend.reduce((s: number, r: { count: number }) => s + r.count, 0) / trend.length)
    : 0;
  return {
    center,
    avgDosesPerDay,
    capacityPct: center.dailyCapacity > 0 ? Math.round((avgDosesPerDay / center.dailyCapacity) * 100) : 0,
    fraudFlags:  fraudCount,
    inventoryWaste: Math.round(Math.random() * 5),   /* placeholder - real: expired doses / total */
  };
}

export function PerformanceCompare() {
  const [selected,  setSelected]  = useState<CenterStats[]>([]);
  const [searchVal, setSearchVal] = useState("");
  const [results,   setResults]   = useState<Center[]>([]);
  const [isPending, startTransition] = useTransition();

  function search() {
    if (!searchVal.trim()) return;
    startTransition(async () => {
      const res  = await fetch(`/api/admin/centers?search=${encodeURIComponent(searchVal)}&limit=5`);
      const json = await res.json();
      setResults(json.data ?? []);
    });
  }

  function addCenter(center: Center) {
    if (selected.length >= MAX_CENTERS) return;
    if (selected.some((s) => s.center._id === center._id)) return;
    startTransition(async () => {
      const stats = await fetchCenterStats(center._id);
      if (stats) setSelected((prev) => [...prev, stats]);
      setResults([]);
      setSearchVal("");
    });
  }

  function removeCenter(id: string) {
    setSelected((prev) => prev.filter((s) => s.center._id !== id));
  }

  /* Build chart data */
  const chartData = [
    { metric: "Avg Doses/Day",  ...Object.fromEntries(selected.map((s) => [s.center.name.slice(0,12), s.avgDosesPerDay])) },
    { metric: "Capacity %",     ...Object.fromEntries(selected.map((s) => [s.center.name.slice(0,12), s.capacityPct])) },
    { metric: "Fraud Flags",    ...Object.fromEntries(selected.map((s) => [s.center.name.slice(0,12), s.fraudFlags])) },
    { metric: "Waste Rate %",   ...Object.fromEntries(selected.map((s) => [s.center.name.slice(0,12), s.inventoryWaste])) },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-5">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-4 w-4 text-[var(--blue-500)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">Performance Comparison</span>
        <span className="ml-auto text-xs text-[var(--foreground-muted)]">{selected.length}/{MAX_CENTERS} centers</span>
      </div>

      {/* Search + add */}
      {selected.length < MAX_CENTERS && (
        <div className="relative">
          <div className="flex gap-2">
            <Input
              placeholder="Search center to compare-"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button size="sm" variant="outline" onClick={search} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-xl">
              {results.map((c) => (
                <button
                  key={c._id}
                  onClick={() => addCenter(c)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-[var(--background-subtle)] transition-colors"
                >
                  <span className="font-medium text-[var(--foreground)]">{c.name}</span>
                  <span className="text-xs text-[var(--foreground-muted)]">{c.address.district}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((s, i) => (
            <motion.div
              key={s.center._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: COLORS[i], color: COLORS[i], background: `${COLORS[i]}15` }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
              {s.center.name.slice(0, 20)}
              <button onClick={() => removeCenter(s.center._id)} className="ml-1 opacity-60 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Chart */}
      {selected.length >= 2 ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="metric" tick={{ fontSize: 10, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            {selected.map((s, i) => (
              <Bar
                key={s.center._id}
                dataKey={s.center.name.slice(0, 12)}
                fill={COLORS[i]}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)]">
          <p className="text-sm text-[var(--foreground-muted)]">
            {selected.length === 0 ? "Search and add centers to compare" : "Add at least 2 centers to see comparison"}
          </p>
        </div>
      )}

      {/* Stats table */}
      {selected.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-2 text-left font-semibold text-[var(--foreground-muted)]">Metric</th>
                {selected.map((s, i) => (
                  <th key={s.center._id} className="pb-2 text-right font-semibold" style={{ color: COLORS[i] }}>
                    {s.center.name.slice(0, 14)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {[
                { label: "Avg Doses/Day",  key: "avgDosesPerDay",  fmt: formatNumber },
                { label: "Capacity %",     key: "capacityPct",     fmt: (v: number) => `${v}%` },
                { label: "Fraud Flags",    key: "fraudFlags",      fmt: String },
                { label: "Waste Rate",     key: "inventoryWaste",  fmt: (v: number) => `${v}%` },
              ].map(({ label, key, fmt }) => (
                <tr key={key}>
                  <td className="py-2 text-[var(--foreground-muted)]">{label}</td>
                  {selected.map((s) => (
                    <td key={s.center._id} className="py-2 text-right font-mono font-semibold text-[var(--foreground)]">
                      {fmt((s as unknown as Record<string, number>)[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
