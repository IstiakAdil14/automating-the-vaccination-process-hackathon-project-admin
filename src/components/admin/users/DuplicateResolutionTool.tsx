"use client";

import { useState, useTransition } from "react";
import { GitMerge, SplitSquareHorizontal, ShieldOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { mergeAccounts } from "@/app/actions/users";
import type { CitizenRow } from "@/app/actions/users";

interface Props {
  primary:   CitizenRow;
  secondary: CitizenRow;
  onResolved: () => void;
  onClose:    () => void;
}

type Action = "MERGE" | "DISTINCT" | "BLOCK_BOTH";

const COMPARE_FIELDS: { label: string; key: keyof CitizenRow }[] = [
  { label: "Name",       key: "name" },
  { label: "NID",        key: "nid" },
  { label: "Phone",      key: "phone" },
  { label: "Email",      key: "email" },
  { label: "Division",   key: "division" },
  { label: "Vax Status", key: "vaccinationStatus" },
  { label: "Registered", key: "createdAt" },
];

function isMatch(a: unknown, b: unknown) {
  return String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();
}

export function DuplicateResolutionTool({ primary, secondary, onResolved, onClose }: Props) {
  const [action,    setAction]    = useState<Action>("MERGE");
  const [note,      setNote]      = useState("");
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (note.trim().length < 5) { setError("Note must be at least 5 characters"); return; }
    setError("");
    startTransition(async () => {
      const res = await mergeAccounts({ primaryId: primary._id, secondaryId: secondary._id, action, note });
      if (!res.ok) { setError(res.error); return; }
      setDone(true);
      setTimeout(onResolved, 1200);
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <CheckCircle2 className="h-10 w-10 text-[var(--accent)]" />
        <p className="text-sm font-semibold text-[var(--foreground)]">Resolution recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-[var(--foreground-muted)]">
        Compare the two suspected duplicate profiles. Highlighted rows indicate matching values.
      </p>

      {/* Side-by-side comparison */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
              <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)]">Field</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--accent)]">Primary</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--info)]">Secondary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {COMPARE_FIELDS.map(({ label, key }) => {
              const a = primary[key];
              const b = secondary[key];
              const match = isMatch(a, b);
              const display = (v: unknown) =>
                key === "createdAt" ? formatDate(String(v ?? "")) : String(v ?? "-");
              return (
                <tr key={key} className={cn(match && "bg-[var(--warning-subtle)]")}>
                  <td className="px-3 py-2 font-medium text-[var(--foreground-muted)]">{label}</td>
                  <td className={cn("px-3 py-2 font-mono", match && "font-semibold text-[var(--warning)]")}>{display(a)}</td>
                  <td className={cn("px-3 py-2 font-mono", match && "font-semibold text-[var(--warning)]")}>{display(b)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action selection */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Resolution Action</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: "MERGE",    label: "Merge Records",  icon: GitMerge,             color: "var(--accent)" },
            { value: "DISTINCT", label: "Mark Distinct",  icon: SplitSquareHorizontal, color: "var(--info)" },
            { value: "BLOCK_BOTH", label: "Block Both",   icon: ShieldOff,            color: "var(--danger)" },
          ] as const).map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAction(value)}
              style={action === value ? { borderColor: color, color } : undefined}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all",
                action === value ? "bg-[var(--background-subtle)]" : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--foreground-muted)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        {action === "MERGE" && (
          <p className="mt-2 text-[10px] text-[var(--foreground-muted)]">
            Vaccination history from the secondary account will be transferred to the primary. Secondary account will be suspended.
          </p>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Audit Note *</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Describe the resolution decision-"
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending} className="flex-1">Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={isPending || note.trim().length < 5}
          className="flex-1 bg-[var(--accent)] text-white hover:opacity-90"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirm Resolution
        </Button>
      </div>
    </div>
  );
}
