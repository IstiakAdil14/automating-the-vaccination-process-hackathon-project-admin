"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSettingsAuditTrail, type SettingsAuditRow } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<string, string> = {
  vaccines:     "Vaccines",
  rbac:         "RBAC",
  policies:     "Policies",
  api_keys:     "API Keys",
  localization: "Localization",
};

const SECTION_COLORS: Record<string, string> = {
  vaccines:     "border-blue-400 text-blue-400",
  rbac:         "border-purple-400 text-purple-400",
  policies:     "border-amber-400 text-amber-400",
  api_keys:     "border-red-400 text-red-400",
  localization: "border-green-400 text-green-400",
};

function formatValue(v: string): string {
  try {
    const parsed = JSON.parse(v);
    if (typeof parsed === "object") return JSON.stringify(parsed, null, 0).slice(0, 60) + (JSON.stringify(parsed).length > 60 ? "-" : "");
    return String(parsed);
  } catch {
    return v;
  }
}

export function SettingsAuditTrail() {
  const [rows, setRows] = useState<SettingsAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const res = await getSettingsAuditTrail(p, 20);
    if (res.ok && res.data) {
      setRows(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const filtered = sectionFilter === "all"
    ? rows
    : rows.filter((r) => r.section === sectionFilter);

  const sections = ["all", ...Object.keys(SECTION_LABELS)];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">Settings Audit Trail</h2>
          <p className="text-xs text-[var(--foreground-muted)]">
            Append-only log - {total} total entries - cannot be cleared
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--danger)] bg-[var(--danger-subtle)] px-2.5 py-1.5">
          <Lock className="h-3 w-3 text-[var(--danger)]" />
          <span className="text-[10px] font-semibold text-[var(--danger)]">Immutable</span>
        </div>
      </div>

      {/* Section filter */}
      <div className="flex flex-wrap gap-1.5">
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setSectionFilter(s)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
              sectionFilter === s
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--background-subtle)]"
            )}
          >
            {s === "all" ? "All" : SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--foreground-muted)]" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                  {["When", "Who", "Section", "Key", "Old Value", "New Value", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--foreground-muted)]">
                      No audit entries found
                    </td>
                  </tr>
                )}
                {filtered.map((row) => (
                  <tr
                    key={row._id}
                    className={cn(
                      "transition-colors hover:bg-[var(--background-subtle)]",
                      row.irreversible && "bg-[var(--danger-subtle)]/30"
                    )}
                  >
                    <td className="px-3 py-2.5 text-[var(--foreground-muted)] whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{row.adminName}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", SECTION_COLORS[row.section] ?? "border-[var(--border)]")}
                      >
                        {SECTION_LABELS[row.section] ?? row.section}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[var(--foreground-muted)]">{row.key}</td>
                    <td className="px-3 py-2.5 max-w-[120px] truncate text-[var(--foreground-muted)]">
                      {formatValue(row.oldValue)}
                    </td>
                    <td className="px-3 py-2.5 max-w-[120px] truncate">
                      {formatValue(row.newValue)}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.irreversible && (
                        <Badge className="text-[10px] bg-[var(--danger)] text-white border-0">
                          irreversible
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--foreground-muted)]">
                Page {page} of {pages} - {total} entries
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
