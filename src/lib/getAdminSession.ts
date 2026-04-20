import { auth } from "./auth";
import { redirect } from "next/navigation";
import type { AdminRole, Permission } from "./permissions";

/* --- Typed session shape ------------------------------------------------------ */
export interface AdminSession {
  user: {
    id:          string;
    name:        string;
    email:       string;
    role:        AdminRole;
    permissions: Permission[];
    division?:   string;
    lastLogin?:  string;
  };
}

/* --- Get session or redirect to login ----------------------------------------- */
export async function getAdminSession(): Promise<AdminSession> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session as AdminSession;
}

/* --- Get session or return null (for optional auth checks) -------------------- */
export async function getAdminSessionOrNull(): Promise<AdminSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session as AdminSession;
}

/* --- Require a specific role, redirect with error if insufficient -------------- */
export async function requireRole(
  allowedRoles: AdminRole[],
  redirectTo = "/dashboard?error=insufficient_permissions"
): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!allowedRoles.includes(session.user.role)) {
    redirect(redirectTo);
  }

  return session;
}

/* --- Require a specific permission ------------------------------------------- */
export async function requirePermission(
  permission: Permission,
  redirectTo = "/dashboard?error=insufficient_permissions"
): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session.user.permissions.includes(permission)) {
    redirect(redirectTo);
  }

  return session;
}
