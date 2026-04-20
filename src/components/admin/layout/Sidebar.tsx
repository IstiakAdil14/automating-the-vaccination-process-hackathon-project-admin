"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Map, Building2, Users, UserCircle,
  Package, ShieldAlert, Megaphone, FileBarChart, Settings,
  Syringe, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -- Nav config --------------------------------------------------------------- */
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",    href: "/dashboard",  icon: LayoutDashboard, badge: null },
      { label: "Heatmap",      href: "/heatmap",    icon: Map,             badge: null },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Centers",      href: "/centers",    icon: Building2,       badge: null },
      { label: "Staff",        href: "/staff",       icon: Users,           badge: null },
      { label: "Citizens",     href: "/users",       icon: UserCircle,      badge: null },
      { label: "Supply Chain", href: "/supply",      icon: Package,         badge: 3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Fraud & Audit", href: "/fraud",     icon: ShieldAlert,     badge: 7 },
      { label: "Broadcast",     href: "/broadcast", icon: Megaphone,       badge: null },
      { label: "Reports",       href: "/reports",   icon: FileBarChart,    badge: null },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings",     href: "/settings",   icon: Settings,        badge: null },
    ],
  },
] as const;

/* -- Types -- */
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/* -- Sidebar ------------------------------------------------------------------- */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="glass-sidebar relative flex h-screen flex-shrink-0 flex-col overflow-hidden"
      style={{ zIndex: 40 }}
    >
      {/* -- Logo -- */}
      <div className="flex h-16 items-center justify-between border-b border-[var(--sidebar-border)] px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--health-green-500)] shadow-[0_0_12px_rgba(16,185,129,0.4)]">
            <Syringe className="h-5 w-5 text-white" />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <span className="block whitespace-nowrap text-sm font-bold text-white">
                  VaxAdmin
                </span>
                <span className="block whitespace-nowrap text-[10px] font-medium text-[var(--health-green-400)] uppercase tracking-widest">
                  Gov. Health Portal
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* -- Nav -- */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {/* Group label */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--sidebar-text-muted)]"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            <ul className="space-y-0.5 px-2">
              {group.items.map(({ label, href, icon: Icon, badge }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "nav-item group relative",
                        active && "active",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      {/* Icon */}
                      <div className="relative flex-shrink-0">
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] transition-colors",
                            active
                              ? "text-[var(--health-green-400)]"
                              : "text-[var(--sidebar-text)] group-hover:text-white"
                          )}
                        />
                        {/* Badge on icon when collapsed */}
                        {collapsed && badge !== null && (
                          <span className="notif-badge">{badge}</span>
                        )}
                      </div>

                      {/* Label + badge */}
                      <AnimatePresence initial={false}>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-1 items-center justify-between overflow-hidden whitespace-nowrap"
                          >
                            <span>{label}</span>
                            {badge !== null && (
                              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--red-500)] px-1.5 text-[10px] font-bold text-white">
                                {badge}
                              </span>
                            )}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Tooltip when collapsed */}
                      {collapsed && (
                        <div className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md bg-[var(--navy-800)] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
                          {label}
                          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-[var(--navy-800)]" />
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Group divider */}
            <div className="mx-4 mt-3 mb-2 divider" />
          </div>
        ))}
      </nav>

      {/* -- Collapse toggle -- */}
      <div className="border-t border-[var(--sidebar-border)] p-3">
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--sidebar-text-muted)] transition-all hover:bg-[var(--sidebar-hover-bg)] hover:text-white",
            collapsed && "justify-center px-0"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
