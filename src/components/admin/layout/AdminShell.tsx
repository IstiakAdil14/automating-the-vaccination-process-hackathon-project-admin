"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import {
  Search, LogOut, Moon, Sun, Menu, X,
  ChevronRight, Shield,
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useTheme } from "@/components/ui/theme-provider";
import { cn } from "@/lib/utils";
import { GlobalSearch, useGlobalSearch } from "@/components/admin/shared/GlobalSearch";
import { NotificationBell } from "@/components/admin/shared/NotificationBell";
import { ToastProvider } from "@/components/admin/shared/ToastProvider";

/* -- Breadcrumb helper -- */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  heatmap:   "Heatmap",
  centers:   "Centers",
  staff:     "Staff",
  users:     "Citizens",
  supply:    "Supply Chain",
  fraud:     "Fraud & Audit",
  broadcast: "Broadcast",
  reports:   "Reports",
  settings:  "Settings",
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
    href:  "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));
}

/* -- AdminShell --------------------------------------------------------------- */
interface AdminShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
  userRole?: string;
}

export function AdminShell({ children, userEmail, userRole = "Super Admin" }: AdminShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch();
  const breadcrumbs = useBreadcrumbs();
  const pathname = usePathname();

  /* Close mobile drawer on route change */
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">

      {/* -- Desktop Sidebar -- */}
      <div className="hidden lg:flex">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      </div>

      {/* -- Mobile Sidebar Drawer -- */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* -- Main area -- */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* -- Topbar -- */}
        <header className="topbar-glass relative z-30 flex h-16 flex-shrink-0 items-center gap-4 px-4 lg:px-6">

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)] lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav className="hidden flex-1 items-center gap-1.5 lg:flex" aria-label="Breadcrumb">
            <span className="text-xs text-[var(--foreground-subtle)]">VaxAdmin</span>
            {breadcrumbs.map(({ label, isLast }) => (
              <span key={label} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-[var(--foreground-subtle)]" />
                <span
                  className={cn(
                    "text-xs font-medium",
                    isLast
                      ? "text-[var(--foreground)]"
                      : "text-[var(--foreground-muted)]"
                  )}
                >
                  {label}
                </span>
              </span>
            ))}
          </nav>

          {/* Mobile title */}
          <span className="flex-1 text-sm font-semibold lg:hidden">
            {breadcrumbs.at(-1)?.label ?? "VaxAdmin"}
          </span>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">

            {/* Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background-subtle)] px-3 py-1.5 text-xs text-[var(--foreground-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)] sm:flex"
              aria-label="Open search"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search-</span>
              <span className="kbd">-K</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)]"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark"
                ? <Sun className="h-4 w-4" />
                : <Moon className="h-4 w-4" />
              }
            </button>

            {/* Notifications */}
            <NotificationBell />

            {/* User pill */}
            <div className="hidden items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background-subtle)] px-3 py-1.5 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--navy-800)] text-xs font-bold text-white dark:bg-[var(--navy-700)]">
                {(userEmail?.[0] ?? "A").toUpperCase()}
              </div>
              <div className="hidden xl:block">
                <p className="text-xs font-medium leading-none text-[var(--foreground)]">
                  {userEmail?.split("@")[0] ?? "Admin"}
                </p>
                <div className="mt-1 role-badge">
                  <Shield className="h-2.5 w-2.5" />
                  {userRole}
                </div>
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground-muted)] transition-colors hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)]"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* -- Page content with route transition -- */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full p-4 lg:p-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* -- Global Search -- */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* -- Toast Provider -- */}
      <ToastProvider />
    </div>
  );
}
