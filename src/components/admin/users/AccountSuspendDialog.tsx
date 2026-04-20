"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { suspendAccount } from "@/app/actions/users";
import { SuspendCitizenSchema } from "@/lib/schemas/users";

const REASONS = [
  { value: "FRAUDULENT_ACTIVITY", label: "Fraudulent Activity" },
  { value: "DUPLICATE_NID",       label: "Duplicate NID" },
  { value: "SUPPORT_REQUEST",     label: "Support Request" },
  { value: "OTHER",               label: "Other" },
] as const;

interface Props {
  citizenId:   string;
  citizenName: string;
  open:        boolean;
  onClose:     () => void;
  onSuspended: () => void;
}

export function AccountSuspendDialog({ citizenId, citizenName, open, onClose, onSuspended }: Props) {
  const [reason,       setReason]       = useState<string>("");
  const [note,         setNote]         = useState("");
  const [durationType, setDurationType] = useState<"temporary" | "permanent">("temporary");
  const [suspendUntil, setSuspendUntil] = useState("");
  const [error,        setError]        = useState("");
  const [isPending,    startTransition] = useTransition();

  function handleSubmit() {
    const raw    = { reason, note, durationType, suspendUntil: durationType === "temporary" ? suspendUntil : undefined };
    const parsed = SuspendCitizenSchema.safeParse(raw);
    if (!parsed.success) { setError(parsed.error.errors[0]?.message ?? "Invalid"); return; }
    setError("");
    startTransition(async () => {
      const res = await suspendAccount(citizenId, parsed.data);
      if (!res.ok) { setError(res.error); return; }
      setReason(""); setNote(""); setSuspendUntil(""); setDurationType("temporary");
      onSuspended();
    });
  }

  const canSubmit = reason && note.length >= 10 && (durationType === "permanent" || suspendUntil);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--danger)]">
            <Ban className="h-5 w-5" /> Suspend Account
          </DialogTitle>
          <DialogDescription>
            Suspending <strong>{citizenName}</strong> will immediately block their app login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          <div className="flex items-start gap-3 rounded-xl border border-[var(--warning)] bg-[var(--warning-subtle)] p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--warning)]" />
            <p className="text-xs text-[var(--warning-foreground)]">
              The citizen will be logged out immediately and unable to book appointments.
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Reason *</label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReason(value)}
                  className={cn(
                    "rounded-xl border-2 p-2.5 text-xs font-medium transition-all text-left",
                    reason === value
                      ? "border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)]"
                      : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--danger)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Duration *</label>
            <div className="grid grid-cols-2 gap-2">
              {(["temporary", "permanent"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDurationType(type)}
                  className={cn(
                    "rounded-xl border-2 p-2.5 text-xs font-medium capitalize transition-all",
                    durationType === type
                      ? "border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)]"
                      : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--danger)]"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {durationType === "temporary" && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Suspend Until *</label>
              <input
                type="date"
                value={suspendUntil}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setSuspendUntil(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--danger)] focus:outline-none"
              />
            </div>
          )}

          {/* Note */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Note *</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Describe the reason in detail (min 10 characters)-"
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--danger)] focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            className="bg-[var(--danger)] text-white hover:opacity-90"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Suspend Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
