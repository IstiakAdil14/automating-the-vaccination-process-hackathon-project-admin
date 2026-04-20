"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ShieldCheck, Ban, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { reactivateAccount } from "@/app/actions/users";
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

/* --- Props -------------------------------------------------------------------- */
interface Props {
  data:        CitizenRow[];
  loading:     boolean;
  pagination:  { page: number; pages: number; total: number };
  onPageChange: (p: number) => void;
  onView:      (row: CitizenRow) => void;
  onVerify:    (row: CitizenRow) => void;
  onSuspend:   (row: CitizenRow) => void;
  onRefresh:   () => void;
}

export function CitizenResultsTable({ data, loading, pagination, onPageChange, onView, onVerify, onSuspend, onRefresh }: Props) {
  const [reactivating, setReactivating] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleReactivate(row: CitizenRow) {
    setReactivating(row._id);
    startTransition(async () => {
      await reactivateAccount(row._id);
      setReactivating(null);
      onRefresh();
    });
  }

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
              {["Name", "NID", "Phone", "Division", "Vax Status", "Registered", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                  {h}
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
              ) : data.map((row, i) => (
                <motion.tr
                  key={row._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="cursor-pointer transition-colors hover:bg-[var(--background-subtle)]"
                  onClick={() => onView(row)}
                >
                  {/* Name */}
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

                  {/* NID masked */}
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-[var(--foreground-muted)]">{maskNid(row.nid)}</span>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3.5 text-sm text-[var(--foreground-muted)]">{row.phone}</td>

                  {/* Division */}
                  <td className="px-4 py-3.5 text-sm">{row.division}</td>

                  {/* Vaccination status */}
                  <td className="px-4 py-3.5">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[row.vaccinationStatus] ?? "")}>
                      {row.vaccinationStatus}
                    </span>
                  </td>

                  {/* Registered */}
                  <td className="px-4 py-3.5 text-xs text-[var(--foreground-muted)]">
                    {formatDate(row.createdAt)}
                  </td>

                  {/* Actions */}
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
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
        <span className="text-xs text-[var(--foreground-muted)]">
          Page {pagination.page} of {pagination.pages} - {formatNumber(pagination.total)} total
        </span>
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
