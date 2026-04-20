"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { suspendCenter } from "@/app/actions/centers";
import { SuspendSchema } from "@/lib/schemas/center";

interface Props {
  centerId:    string;
  open:        boolean;
  onClose:     () => void;
  onSuspended: () => void;
}

export function SuspendDialog({ centerId, open, onClose, onSuspended }: Props) {
  const [reason,    setReason]    = useState("");
  const [error,     setError]     = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const parsed = SuspendSchema.safeParse({ reason });
    if (!parsed.success) { setError(parsed.error.errors[0]?.message ?? "Invalid"); return; }
    setError("");
    startTransition(async () => {
      const res = await suspendCenter(centerId, { reason });
      if (!res.ok) { setError(res.error); return; }
      setReason("");
      onSuspended();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--danger)]">
            <Ban className="h-5 w-5" /> Suspend Center
          </DialogTitle>
          <DialogDescription>
            This will immediately prevent the center from accepting new appointments.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
            Suspension Reason *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Describe the reason for suspension (min 10 characters)-"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--danger)] focus:outline-none resize-none"
          />
          {error && <p className="mt-1.5 text-xs text-[var(--danger)]">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || reason.length < 10}
            className="bg-[var(--danger)] text-white hover:bg-[var(--red-600)]"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Suspend Center
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
