"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { suspendStaff } from "@/app/actions/staff";
import { StaffSuspendSchema } from "@/lib/schemas/staff";

interface Props {
  staffId:     string;
  staffName:   string;
  open:        boolean;
  onClose:     () => void;
  onSuspended: () => void;
}

export function StaffSuspendDialog({ staffId, staffName, open, onClose, onSuspended }: Props) {
  const [reason,       setReason]       = useState("");
  const [durationType, setDurationType] = useState<"temporary" | "permanent">("temporary");
  const [suspendUntil, setSuspendUntil] = useState("");
  const [error,        setError]        = useState("");
  const [isPending,    startTransition] = useTransition();

  function handleSubmit() {
    const raw    = { reason, durationType, suspendUntil: durationType === "temporary" ? suspendUntil : undefined };
    const parsed = StaffSuspendSchema.safeParse(raw);
    if (!parsed.success) { setError(parsed.error.errors[0]?.message ?? "Invalid"); return; }
    setError("");
    startTransition(async () => {
      const res = await suspendStaff(staffId, parsed.data);
      if (!res.ok) { setError(res.error); return; }
      setReason(""); setSuspendUntil(""); setDurationType("temporary");
      onSuspended();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--danger)]">
            <Ban className="h-5 w-5" /> Suspend Staff Member
          </DialogTitle>
          <DialogDescription>
            Suspending <strong>{staffName}</strong> will immediately revoke their system access.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Impact warning */}
          <div className="flex items-start gap-3 rounded-xl border border-[var(--warning)] bg-[var(--warning-subtle)] p-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[var(--warning)] mt-0.5" />
            <p className="text-xs text-[var(--warning-foreground)]">
              Any pending vaccination sessions assigned to this staff member will need to be reassigned.
            </p>
          </div>

          {/* Duration type */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Duration</label>
            <div className="grid grid-cols-2 gap-2">
              {(["temporary", "permanent"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDurationType(type)}
                  className={cn(
                    "rounded-xl border-2 p-3 text-sm font-medium capitalize transition-all",
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

          {/* Date picker for temporary */}
          {durationType === "temporary" && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                Suspend Until *
              </label>
              <input
                type="date"
                value={suspendUntil}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setSuspendUntil(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--danger)] focus:outline-none"
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Describe the reason for suspension (min 10 characters)-"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--danger)] focus:outline-none resize-none"
            />
          </div>

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || reason.length < 10 || (durationType === "temporary" && !suspendUntil)}
            className="bg-[var(--danger)] text-white hover:bg-[var(--red-600)]"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Suspend Staff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
