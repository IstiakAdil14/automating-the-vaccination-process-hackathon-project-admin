/* --- Roles ------------------------------------------------------------------- */
export const ROLES = {
  SUPER_ADMIN:    "SUPER_ADMIN",
  NATIONAL_ADMIN: "NATIONAL_ADMIN",
  DIVISION_ADMIN: "DIVISION_ADMIN",
} as const;

export type AdminRole = (typeof ROLES)[keyof typeof ROLES];

/* --- Permissions -------------------------------------------------------------- */
export const PERMISSIONS = {
  /* Centers */
  VIEW_CENTERS:    "view:centers",
  MANAGE_CENTERS:  "manage:centers",

  /* Staff */
  VIEW_STAFF:      "view:staff",
  MANAGE_STAFF:    "manage:staff",

  /* Citizens */
  VIEW_CITIZENS:   "view:citizens",

  /* Supply */
  VIEW_SUPPLY:     "view:supply",
  MANAGE_SUPPLY:   "manage:supply",

  /* Fraud & Audit */
  VIEW_AUDIT:      "view:audit",
  RESOLVE_FRAUD:   "resolve:fraud",

  /* Broadcast */
  BROADCAST:       "broadcast",

  /* Reports */
  VIEW_REPORTS:    "view:reports",
  EXPORT_DATA:     "export:data",

  /* Settings */
  MANAGE_SETTINGS: "manage:settings",
  MANAGE_ADMINS:   "manage:admins",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/* --- Default permissions per role -------------------------------------------- */
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS) as Permission[],

  NATIONAL_ADMIN: [
    PERMISSIONS.VIEW_CENTERS,    PERMISSIONS.MANAGE_CENTERS,
    PERMISSIONS.VIEW_STAFF,      PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.VIEW_CITIZENS,
    PERMISSIONS.VIEW_SUPPLY,     PERMISSIONS.MANAGE_SUPPLY,
    PERMISSIONS.VIEW_AUDIT,      PERMISSIONS.RESOLVE_FRAUD,
    PERMISSIONS.BROADCAST,
    PERMISSIONS.VIEW_REPORTS,    PERMISSIONS.EXPORT_DATA,
  ],

  DIVISION_ADMIN: [
    PERMISSIONS.VIEW_CENTERS,
    PERMISSIONS.VIEW_STAFF,
    PERMISSIONS.VIEW_CITIZENS,
    PERMISSIONS.VIEW_SUPPLY,
    PERMISSIONS.VIEW_AUDIT,
    PERMISSIONS.VIEW_REPORTS,
  ],
};

/* --- Routes blocked per role -------------------------------------------------- */
export const ROLE_BLOCKED_ROUTES: Record<AdminRole, string[]> = {
  SUPER_ADMIN:    [],
  NATIONAL_ADMIN: ["/settings"],
  DIVISION_ADMIN: ["/settings", "/broadcast"],
};

/* --- Checker functions -------------------------------------------------------- */
function hasPermission(permissions: string[], perm: Permission): boolean {
  return permissions.includes(perm);
}

export function canManageCenters(permissions: string[])  { return hasPermission(permissions, PERMISSIONS.MANAGE_CENTERS); }
export function canViewCenters(permissions: string[])    { return hasPermission(permissions, PERMISSIONS.VIEW_CENTERS); }
export function canManageStaff(permissions: string[])    { return hasPermission(permissions, PERMISSIONS.MANAGE_STAFF); }
export function canBroadcast(permissions: string[])      { return hasPermission(permissions, PERMISSIONS.BROADCAST); }
export function canViewAudit(permissions: string[])      { return hasPermission(permissions, PERMISSIONS.VIEW_AUDIT); }
export function canResolveFraud(permissions: string[])   { return hasPermission(permissions, PERMISSIONS.RESOLVE_FRAUD); }
export function canExportData(permissions: string[])     { return hasPermission(permissions, PERMISSIONS.EXPORT_DATA); }
export function canManageSettings(permissions: string[]) { return hasPermission(permissions, PERMISSIONS.MANAGE_SETTINGS); }
export function canManageAdmins(permissions: string[])   { return hasPermission(permissions, PERMISSIONS.MANAGE_ADMINS); }
export function canManageSupply(permissions: string[])   { return hasPermission(permissions, PERMISSIONS.MANAGE_SUPPLY); }

/* --- Role display helpers ----------------------------------------------------- */
export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN:    "Super Admin",
  NATIONAL_ADMIN: "National Admin",
  DIVISION_ADMIN: "Division Admin",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as AdminRole] ?? role;
}
