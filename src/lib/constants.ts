export const APP_NAME = "VaxAdmin";

export const NAV_ITEMS = [
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

export const VACCINE_TYPES = ["BCG", "OPV", "DPT", "Hepatitis B", "MMR", "COVID-19"] as const;

export { ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from "./permissions";
export type { AdminRole, Permission } from "./permissions";
