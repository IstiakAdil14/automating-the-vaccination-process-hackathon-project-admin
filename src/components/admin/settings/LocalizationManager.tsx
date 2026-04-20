"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getLocaleStrings, updateLocaleString, type LocaleString } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

/* --- Inline editable Bangla cell ---------------------------------------------- */
function BanglaCell({
  value,
  onSave,
}: {
  value: string | undefined;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const ref = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== (value ?? "") && draft.trim()) {
      startTransition(async () => { await onSave(draft.trim()); });
    }
  }

  if (editing) {
    return (
      <Input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); } }}
        className="h-7 px-2 py-0 text-xs"
        placeholder="----- ------ ------"
        dir="auto"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-pointer rounded px-1 hover:bg-[var(--background-subtle)]",
        !value && "text-[var(--foreground-subtle)] italic"
      )}
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin inline" /> : (value || "Click to translate-")}
    </span>
  );
}

/* --- Main --------------------------------------------------------------------- */
export function LocalizationManager() {
  const [strings, setStrings] = useState<LocaleString[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getLocaleStrings().then((res) => {
      if (res.ok) setStrings(res.data as LocaleString[]);
      setLoading(false);
    });
  }, []);

  async function handleSave(key: string, bn: string) {
    await updateLocaleString(key, bn);
    setStrings((prev) =>
      prev.map((s) => s.key === key ? { ...s, bn, status: "translated" } : s)
    );
  }

  const translated = strings.filter((s) => s.status === "translated").length;
  const total = strings.length;
  const pct = total > 0 ? Math.round((translated / total) * 100) : 0;

  const filtered = strings.filter((s) => {
    if (pendingOnly && s.status !== "pending") return false;
    if (search && !s.key.includes(search) && !s.en.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Localization Manager</h2>
        <p className="text-xs text-[var(--foreground-muted)]">
          Click any Bangla cell to edit inline
        </p>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold">Translation Progress</span>
          <span className="text-xs text-[var(--foreground-muted)]">
            {translated}/{total} strings translated ({pct}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--background-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by key or English text-"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs max-w-xs"
        />
        <Button
          size="sm"
          variant={pendingOnly ? "default" : "outline"}
          onClick={() => setPendingOnly((v) => !v)}
          className="gap-1.5 h-8 text-xs"
        >
          <Filter className="h-3.5 w-3.5" />
          Pending only
          {pendingOnly && (
            <Badge className="ml-1 h-4 px-1 text-[10px]">
              {strings.filter((s) => s.status === "pending").length}
            </Badge>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--foreground-muted)]" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                {["Key", "English", "Bangla (click to edit)", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[var(--foreground-muted)]">
                    No strings match the current filter
                  </td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr key={s.key} className="hover:bg-[var(--background-subtle)] transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[var(--foreground-muted)]">{s.key}</td>
                  <td className="px-3 py-2.5">{s.en}</td>
                  <td className="px-3 py-2.5">
                    <BanglaCell value={s.bn} onSave={(bn) => handleSave(s.key, bn)} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        s.status === "translated"
                          ? "border-[var(--success)] text-[var(--success)]"
                          : "border-[var(--warning)] text-[var(--warning)]"
                      )}
                    >
                      {s.status}
                    </Badge>
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
