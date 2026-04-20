"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { getPerCenterStock, type CenterStockRow } from "@/app/actions/supply";

const DIVISIONS = ["Dhaka","Chittagong","Sylhet","Rajshahi","Khulna","Barisal","Rangpur","Mymensingh"];

const STATUS_STYLES: Record<CenterStockRow["overallStatus"], string> = {
  SUFFICIENT: "bg-[var(--accent-subtle)] text-[var(--accent)]",
  LOW:        "bg-[var(--warning-subtle)] text-[var(--warning)]",
  CRITICAL:   "bg-[var(--danger-subtle)] text-[var(--danger)]",
};

function stockCellClass(qty: number, threshold: number) {
  if (qty === 0)              return "text-[var(--danger)] font-bold";
  if (qty <= threshold * 0.2) return "text-[var(--danger)]";
  if (qty <= threshold)       return "text-[var(--warning)]";
  return "text-[var(--accent)]";
}

const PAGE_SIZE = 15;

export function PerCenterStockTable() {
  const [data,       setData]       = useState<CenterStockRow[]>([]);
  const [division,   setDivision]   = useState("all");
  const [stockLevel, setStockLevel] = useState("all");
  const [page,       setPage]       = useState(1);
  const [selected,   setSelected]   = useState<CenterStockRow | null>(null);
  const [isPending,  startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const res = await getPerCenterStock({
        division:   division   !== "all" ? division   : undefined,
        stockLevel: stockLevel !== "all" ? stockLevel : undefined,
      });
      if (res.ok) { setData(res.data); setPage(1); }
    });
  }, [division, stockLevel]);

  useEffect(() => { load(); }, [load]);

  const pages   = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const visible = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allVaccines = data[0]?.vaccines ?? [];

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={division} onValueChange={setDivision}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Division" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stockLevel} onValueChange={setStockLevel}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Stock Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="sufficient">Sufficient</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="critical">Critical / Out</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-[var(--foreground-muted)]">
            {isPending ? "Loading-" : `${formatNumber(data.length)} centers`}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Center</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Division</th>
                  {allVaccines.map((v) => (
                    <th key={v.vaccineId} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                      {v.shortName}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isPending ? (
                  <tr><td colSpan={allVaccines.length + 3} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--accent)]" />
                  </td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={allVaccines.length + 3} className="py-16 text-center text-sm text-[var(--foreground-muted)]">
                    No centers found
                  </td></tr>
                ) : visible.map((row) => (
                  <tr
                    key={row.centerId}
                    onClick={() => setSelected(row)}
                    className="cursor-pointer transition-colors hover:bg-[var(--background-subtle)]"
                  >
                    <td className="px-4 py-3.5 font-medium text-[var(--foreground)]">{row.centerName}</td>
                    <td className="px-4 py-3.5 text-sm text-[var(--foreground-muted)]">{row.division}</td>
                    {row.vaccines.map((v) => (
                      <td key={v.vaccineId} className={cn("px-4 py-3.5 text-right font-mono text-sm tabular-nums", stockCellClass(v.qty, v.threshold))}>
                        {v.qty === 0 ? "OUT" : formatNumber(v.qty)}
                      </td>
                    ))}
                    <td className="px-4 py-3.5">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[row.overallStatus])}>
                        {row.overallStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
            <span className="text-xs text-[var(--foreground-muted)]">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail popup */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>{selected?.centerName}</span>
              <span className="text-xs font-normal text-[var(--foreground-muted)]">{selected?.division} - {selected?.district}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-6 pb-6">
            {selected?.vaccines.map((v) => (
              <div key={v.vaccineId} className={cn(
                "flex items-center justify-between rounded-xl border p-4",
                v.qty === 0 ? "border-[var(--danger)] bg-[var(--danger-subtle)]" :
                v.qty <= v.threshold ? "border-[var(--warning)] bg-[var(--warning-subtle)]" :
                "border-[var(--border)] bg-[var(--surface)]"
              )}>
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{v.shortName}</p>
                  {v.expiryDate && (
                    <p className="text-xs text-[var(--foreground-muted)]">Expires {formatDate(v.expiryDate)}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className={cn("text-xl font-bold tabular-nums", stockCellClass(v.qty, v.threshold))}>
                    {v.qty === 0 ? "OUT" : formatNumber(v.qty)}
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)]">threshold: {v.threshold}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
