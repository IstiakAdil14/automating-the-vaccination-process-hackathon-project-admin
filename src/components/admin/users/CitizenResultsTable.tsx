"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ShieldCheck, Ban, CheckCircle2, ChevronLeft, ChevronRight, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Settings2, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { reactivateAccount } from "@/app/actions/users";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import type { CitizenRow } from "@/app/actions/users";

/* --- Helpers ------------------------------------------------------------------ */
function maskNid(nid: string): string {
  if (nid.length <= 4) return "****";
  const groups = nid.match(/.{1,4}/g) ?? [nid];
  return groups.map((g, i) => i === groups.length - 1 ? g : "XXXX").join("-");
}

const STATUS_STYLES: Record<string, string> = {
  UNVACCINATED: "bg-[var(--background-subtle)] text-[var(--foreground-muted)]",
  PARTIAL:      "bg-[var(--warning-subtle)] text-[var(--warning)]",
  COMPLETE:     "bg-[var(--accent-subtle)] text-[var(--accent)]",
};

type SortField = "name" | "nid" | "phone" | "division" | "vaccinationStatus" | "createdAt";
type SortDir = "asc" | "desc" | null;

interface Column {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
  sortField?: SortField;
}

/* --- Props -------------------------------------------------------------------- */
interface Props {
  data:        CitizenRow[];
  loading:     boolean;
  pagination:  { page: number; pages: number; total: number; limit: number };
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
  onView:      (row: CitizenRow) => void;
  onVerify:    (row: CitizenRow) => void;
  onSuspend:   (row: CitizenRow) => void;
  onRefresh:   () => void;
}

export function CitizenResultsTable({ data, loading, pagination, onPageChange, onLimitChange, onView, onVerify, onSuspend, onRefresh }: Props) {
  const [reactivating, setReactivating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [columns, setColumns] = useState<Column[]>([
    { key: "name", label: "Name", visible: true, sortable: true, sortField: "name" },
    { key: "nid", label: "NID", visible: true, sortable: true, sortField: "nid" },
    { key: "phone", label: "Phone", visible: true, sortable: true, sortField: "phone" },
    { key: "division", label: "Division", visible: true, sortable: true, sortField: "division" },
    { key: "vaccinationStatus", label: "Vax Status", visible: true, sortable: true, sortField: "vaccinationStatus" },
    { key: "createdAt", label: "Registered", visible: true, sortable: true, sortField: "createdAt" },
    { key: "actions", label: "Actions", visible: true, sortable: false },
  ]);
  const [, startTransition] = useTransition();

  function handleReactivate(row: CitizenRow) {
    setReactivating(row._id);
    startTransition(async () => {
      await reactivateAccount(row._id);
      setReactivating(null);
      onRefresh();
    });
  }

  function toggleColumn(key: string) {
    setColumns((cols) => cols.map((c) => c.key === key ? { ...c, visible: !c.visible } : c));
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc");
      if (sortDir === "desc") setSortField(null);
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function toggleSelectAll() {
    if (selected.size === data.length) setSelected(new Set());
    else setSelected(new Set(data.map((r) => r._id)));
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function handleBulkDelete() {
    if (confirm(`Delete ${selected.size} selected citizens?`)) {
      console.log("Bulk delete:", Array.from(selected));
      setSelected(new Set());
    }
  }

  function handleExport() {
    const csv = [columns.filter((c) => c.visible && c.key !== "actions").map((c) => c.label).join(",")];
    sortedData.forEach((row) => {
      const vals = [];
      if (columns.find((c) => c.key === "name" && c.visible)) vals.push(row.name);
      if (columns.find((c) => c.key === "nid" && c.visible)) vals.push(row.nid);
      if (columns.find((c) => c.key === "phone" && c.visible)) vals.push(row.phone);
      if (columns.find((c) => c.key === "division" && c.visible)) vals.push(row.division);
      if (columns.find((c) => c.key === "vaccinationStatus" && c.visible)) vals.push(row.vaccinationStatus);
      if (columns.find((c) => c.key === "createdAt" && c.visible)) vals.push(formatDate(row.createdAt));
      csv.push(vals.join(","));
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `citizens-${Date.now()}.csv`;
    a.click();
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortField || !sortDir) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const visibleCols = columns.filter((c) => c.visible);

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-[var(--foreground-muted)]">{selected.size} selected</span>
              <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="h-7 text-xs text-[var(--danger)]">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleExport} className="h-7 text-xs">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 text-xs">
                <Settings2 className="h-3.5 w-3.5" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((col) => (
                <DropdownMenuCheckboxItem key={col.key} checked={col.visible} onCheckedChange={() => toggleColumn(col.key)}>
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
              <th className="w-12 px-4 py-3">
                <input type="checkbox" checked={selected.size === data.length && data.length > 0} onChange={toggleSelectAll} className="cursor-pointer" />
              </th>
              {visibleCols.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                  {col.sortable ? (
                    <button onClick={() => handleSort(col.sortField!)} className="flex items-center gap-1 hover:text-[var(--foreground)]">
                      {col.label}
                      {sortField === col.sortField ? (
                        sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            <AnimatePresence mode="wait">
              {loading ? (
                <tr key="loading">
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--accent)]" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr key="empty">
                  <td colSpan={7} className="py-16 text-center text-sm text-[var(--foreground-muted)]">
                    No citizens found
                  </td>
                </tr>
              ) : sortedData.map((row, i) => (
                <motion.tr
                  key={row._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="cursor-pointer transition-colors hover:bg-[var(--background-subtle)]"
                  onClick={() => onView(row)}
                >
                  <td className="w-12 px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(row._id)} onChange={() => toggleSelect(row._id)} className="cursor-pointer" />
                  </td>
                  {visibleCols.find((c) => c.key === "name") && (
                    <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--background-subtle)] text-xs font-bold text-[var(--foreground-muted)]">
                        {row.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--foreground)]">{row.name ?? "N/A"}</p>
                        {row.isSuspended && (
                          <span className="text-[10px] font-semibold uppercase text-[var(--danger)]">Suspended</span>
                        )}
                      </div>
                    </div>
                  </td>
                  )}
                  {visibleCols.find((c) => c.key === "nid") && (
                    <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-[var(--foreground-muted)]">{maskNid(row.nid)}</span>
                  </td>
                  )}
                  {visibleCols.find((c) => c.key === "phone") && (
                    <td className="px-4 py-3.5 text-sm text-[var(--foreground-muted)]">{row.phone}</td>
                  )}
                  {visibleCols.find((c) => c.key === "division") && (
                    <td className="px-4 py-3.5 text-sm">{row.division}</td>
                  )}
                  {visibleCols.find((c) => c.key === "vaccinationStatus") && (
                    <td className="px-4 py-3.5">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[row.vaccinationStatus] ?? "")}>
                      {row.vaccinationStatus}
                    </span>
                  </td>
                  )}
                  {visibleCols.find((c) => c.key === "createdAt") && (
                    <td className="px-4 py-3.5 text-xs text-[var(--foreground-muted)]">
                    {formatDate(row.createdAt)}
                  </td>
                  )}
                  {visibleCols.find((c) => c.key === "actions") && (
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onView(row)} className="h-7 px-2 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onVerify(row)} className="h-7 px-2 text-xs text-[var(--info)] hover:bg-[var(--info-subtle)]">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>
                      {row.isSuspended ? (
                        <Button
                          size="sm" variant="ghost"
                          disabled={reactivating === row._id}
                          onClick={() => handleReactivate(row)}
                          className="h-7 px-2 text-xs text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
                        >
                          {reactivating === row._id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => onSuspend(row)} className="h-7 px-2 text-xs text-[var(--danger)] hover:bg-[var(--danger-subtle)]">
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--foreground-muted)]">
            Page {pagination.page} of {pagination.pages} - {formatNumber(pagination.total)} total
          </span>
          <Select value={String(pagination.limit)} onValueChange={(v) => onLimitChange(Number(v))}>
            <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-[var(--foreground-muted)]">per page</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={pagination.page <= 1 || loading} onClick={() => onPageChange(pagination.page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages || loading} onClick={() => onPageChange(pagination.page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
