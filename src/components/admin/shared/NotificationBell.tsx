"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Building2, Users, ShieldAlert, Package, AlertCircle, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "./ToastProvider";
import type { AdminNotif } from "@/app/api/admin/notifications/route";

const TYPE_ICONS: Record<AdminNotif["type"], React.ReactNode> = {
  center_application: <Building2  className="h-4 w-4 text-blue-400" />,
  staff_request:      <Users      className="h-4 w-4 text-purple-400" />,
  fraud_escalation:   <ShieldAlert className="h-4 w-4 text-red-500" />,
  restock:            <Package    className="h-4 w-4 text-amber-400" />,
  system:             <AlertCircle className="h-4 w-4 text-[var(--foreground-muted)]" />,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell() {
  const router  = useRouter();
  const [open,   setOpen]   = useState(false);
  const [notifs, setNotifs] = useState<AdminNotif[]>([]);
  const [unread, setUnread] = useState(0);
  const dropRef = useRef<HTMLDivElement>(null);

  /* -- Fetch notifications -- */
  const fetchNotifs = useCallback(async () => {
    try {
      const res  = await fetch("/api/admin/notifications");
      const json = await res.json() as { notifications: AdminNotif[]; unread: number };
      setNotifs(json.notifications);
      setUnread(json.unread);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  /* -- SSE for real-time critical alerts -- */
  useEffect(() => {
    const es = new EventSource("/api/admin/notifications/stream");

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as AdminNotif & { type_?: string };
        if (data.type_ === "new_notification") {
          /* Show persistent toast for fraud escalations */
          if (data.type === "fraud_escalation") {
            toast.fraud(data.title, data.body);
          } else {
            toast.info(data.title, data.body);
          }
          fetchNotifs();
        }
      } catch { /* ignore */ }
    };

    return () => es.close();
  }, [fetchNotifs]);

  /* -- Close on outside click -- */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function markRead(id: string) {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", id }),
    });
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnread((u) => Math.max(0, u - 1));
  }

  function handleClick(notif: AdminNotif) {
    if (!notif.read) markRead(notif.id);
    setOpen(false);
    router.push(notif.href);
  }

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)]"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <span className="rounded-full bg-[var(--danger-subtle)] px-2 py-0.5 text-xs font-bold text-[var(--danger)]">
                    {unread} new
                  </span>
                )}
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[10px] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    title="Mark all read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <ul className="max-h-[360px] divide-y divide-[var(--border)] overflow-y-auto">
              {notifs.length === 0 && (
                <li className="py-8 text-center text-xs text-[var(--foreground-muted)]">
                  No notifications
                </li>
              )}
              {notifs.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--background-subtle)]",
                    !n.read && "bg-[var(--accent-subtle)]",
                    n.type === "fraud_escalation" && !n.read && "bg-[var(--danger-subtle)]"
                  )}
                >
                  <span className="mt-0.5 flex-shrink-0">{TYPE_ICONS[n.type]}</span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs", !n.read ? "font-semibold" : "font-medium")}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)] line-clamp-2">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--foreground-subtle)]">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]" />
                  )}
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="border-t border-[var(--border)] px-4 py-2.5">
              <button
                onClick={() => { setOpen(false); router.push("/broadcast"); }}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                View all notifications -
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
