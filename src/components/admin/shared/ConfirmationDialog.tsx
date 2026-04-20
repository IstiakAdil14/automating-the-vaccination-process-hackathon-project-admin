"use client";

import { useTransition } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmVariant = "default" | "warning" | "danger";

interface ConfirmationDialogProps {
  open:          boolean;
  title:         string;
  description:   string;
  confirmLabel?: string;
  variant?:      ConfirmVariant;
  onConfirm:     () => void | Promise<void>;
  onCancel:      () => void;
}

const VARIANT_STYLES: Record<ConfirmVariant, { btn: string; icon: React.ReactNode }> = {
  default: {
    btn:  "bg-[var(--accent)] text-white hover:opacity-90",
    icon: null,
  },
  warning: {
    btn:  "bg-[var(--warning)] text-white hover:opacity-90",
    icon: <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />,
  },
  danger: {
    btn:  "bg-[var(--danger)] text-white hover:opacity-90",
    icon: <Trash2 className="h-5 w-5 text-[var(--danger)]" />,
  },
};

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { btn, icon } = VARIANT_STYLES[variant];

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {variant !== "default" && (
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-xs",
              variant === "danger"
                ? "bg-[var(--danger-subtle)] text-[var(--danger)]"
                : "bg-[var(--warning-subtle)] text-[var(--warning)]"
            )}
          >
            This action cannot be undone.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending} className={btn}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
