"use client";

import { Toaster, toast as sonnerToast } from "sonner";
import { AlertTriangle, CheckCircle2, Info, XCircle, ShieldAlert } from "lucide-react";

/* --- Toaster mount ------------------------------------------------------------ */
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:       "!rounded-xl !border !border-[var(--border)] !bg-[var(--surface-raised)] !shadow-xl",
          title:       "!text-sm !font-semibold !text-[var(--foreground)]",
          description: "!text-xs !text-[var(--foreground-muted)]",
          closeButton: "!border-[var(--border)]",
        },
      }}
    />
  );
}

/* --- Typed toast helpers ------------------------------------------------------ */
export const toast = {
  success(title: string, description?: string) {
    sonnerToast.success(title, {
      description,
      icon: <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />,
    });
  },

  error(title: string, description?: string) {
    sonnerToast.error(title, {
      description,
      icon: <XCircle className="h-4 w-4 text-[var(--danger)]" />,
    });
  },

  warning(title: string, description?: string) {
    sonnerToast.warning(title, {
      description,
      icon: <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />,
    });
  },

  info(title: string, description?: string) {
    sonnerToast.info(title, {
      description,
      icon: <Info className="h-4 w-4 text-[var(--accent)]" />,
    });
  },

  /**
   * Persistent fraud alert toast - stays until manually dismissed.
   * Shows an "Investigate" action button that navigates to /fraud.
   */
  fraud(title: string, description?: string) {
    sonnerToast(title, {
      description,
      duration: Infinity,
      icon:     <ShieldAlert className="h-4 w-4 text-red-500" />,
      action: {
        label:   "Investigate",
        onClick: () => { window.location.href = "/fraud"; },
      },
      style: {
        background: "var(--danger-subtle)",
        border:     "1px solid var(--danger)",
        color:      "var(--danger)",
      },
    });
  },
};
