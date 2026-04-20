"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Map, Building2, Users, UserCircle,
  Package, ShieldAlert, Megaphone, FileBarChart, Settings, Syringe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

const icons = {
  LayoutDashboard, Map, Building2, Users, UserCircle,
  Package, ShieldAlert, Megaphone, FileBarChart, Settings,
};

const NAV = [
  { label: "Dashboard",  href: "/dashboard",  icon: "LayoutDashboard" },
  { label: "Heatmap",    href: "/heatmap",    icon: "Map" },
  { label: "Centers",    href: "/centers",    icon: "Building2" },
  { label: "Staff",      href: "/staff",      icon: "Users" },
  { label: "Citizens",   href: "/users",      icon: "UserCircle" },
  { label: "Supply",     href: "/supply",     icon: "Package" },
  { label: "Fraud",      href: "/fraud",      icon: "ShieldAlert" },
  { label: "Broadcast",  href: "/broadcast",  icon: "Megaphone" },
  { label: "Reports",    href: "/reports",    icon: "FileBarChart" },
  { label: "Settings",   href: "/settings",   icon: "Settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Syringe className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">{APP_NAME}</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {NAV.map(({ label, href, icon }) => {
            const Icon = icons[icon as keyof typeof icons];
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
