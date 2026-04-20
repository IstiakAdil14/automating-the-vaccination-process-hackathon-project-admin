"use client";

import { useState, useTransition, useEffect } from "react";
import { Check, X, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SecondAdminConfirmDialog } from "./SecondAdminConfirmDialog";
import {
  getRolePermissions, updateRolePermissions,
  type RolePermissionsMap,
} from "@/app/actions/settings";
import { PERMISSIONS, ROLE_LABELS, type AdminRole, type Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/* --- Config ------------------------------------------------------------------- */
const ROLES_ORDER: AdminRole[] = ["SUPER_ADMIN", "NATIONAL_ADMIN", "DIVISION_ADMIN"];

const FEATURES: { label: string; perms: { action: string; perm: Permission }[] }[] = [
  {
    label: "Dashboard",
    perms: [
      { action: "View", perm: PERMISSIONS.VIEW_REPORTS },
    ],
  },
  {
    label: "Centers",
    perms: [
      { action: "View",   perm: PERMISSIONS.VIEW_CENTERS },
      { action: "Manage", perm: PERMISSIONS.MANAGE_CENTERS },
    ],
  },
  {
    label: "Staff",
    perms: [
      { action: "View",   perm: PERMISSIONS.VIEW_STAFF },
      { action: "Manage", perm: PERMISSIONS.MANAGE_STAFF },
    ],
  },
  {
    label: "Citizens",
    perms: [
      { action: "View", perm: PERMISSIONS.VIEW_CITIZENS },
    ],
  },
  {
    label: "Supply Chain",
    perms: [
      { action: "View",   perm: PERMISSIONS.VIEW_SUPPLY },
      { action: "Manage", perm: PERMISSIONS.MANAGE_SUPPLY },
    ],
  },
  {
    label: "Fraud & Audit",
    perms: [
      { action: "View",    perm: PERMISSIONS.VIEW_AUDIT },
      { action: "Resolve", perm: PERMISSIONS.RESOLVE_FRAUD },
    ],
  },
  {
    label: "Broadcast",
    perms: [
      { action: "Send", perm: PERMISSIONS.BROADCAST },
    ],
  },
  {
    label: "Reports",
    perms: [
      { action: "View",   perm: PERMISSIONS.VIEW_REPORTS },
      { action: "Export", perm: PERMISSIONS.EXPORT_DATA },
    ],
  },
  {
    label: "Settings",
    perms: [
      { action: "Manage", perm: PERMISSIONS.MANAGE_SETTINGS },
    ],
  },
  {
    label: "Admin Accounts",
    perms: [
      { action: "Manage", perm: PERMISSIONS.MANAGE_ADMINS },
    ],
  },
];

/* --- Permission toggle cell --------------------------------------------------- */
function PermCell({
  allowed,
  locked,
  onToggle,
}: {
  allowed: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={locked ? undefined : onToggle}
      disabled={locked}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
        allowed
          ? "bg-[var(--success-subtle)] text-[var(--success)]"
          : "bg-[var(--background-subtle)] text-[var(--foreground-subtle)]",
        !locked && "hover:opacity-80 cursor-pointer",
        locked && "cursor-not-allowed opacity-60"
      )}
      title={locked ? "Super Admin permissions are fixed" : allowed ? "Allowed - click to deny" : "Denied - click to allow"}
    >
      {allowed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
    </button>
  );
}

/* --- Main --------------------------------------------------------------------- */
export function RBACEditor() {
  const [activeRole, setActiveRole] = useState<AdminRole>("NATIONAL_ADMIN");
  const [permMap, setPermMap] = useState<RolePermissionsMap>({});
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState("");

  useEffect(() => {
    getRolePermissions().then((res) => {
      if (res.ok) setPermMap(res.data as RolePermissionsMap);
      setLoading(false);
    });
  }, []);

  function toggle(perm: Permission) {
    setPermMap((prev) => {
      const current = prev[activeRole] ?? [];
      const next = current.includes(perm)
        ? current.filter((p) => p !== perm)
        : [...current, perm];
      return { ...prev, [activeRole]: next };
    });
    setDirty(true);
  }

  function handleSave() {
    setConfirmOpen(true);
  }

  function onConfirmed(email: string, password: string) {
    setConfirmOpen(false);
    startTransition(async () => {
      const res = await updateRolePermissions(
        activeRole,
        permMap[activeRole] ?? [],
        email,
        password
      );
      if (res.ok) {
        setDirty(false);
        setToast("Permissions updated successfully");
        setTimeout(() => setToast(""), 3000);
      }
    });
  }

  const currentPerms = permMap[activeRole] ?? [];
  const isSuperAdmin = activeRole === "SUPER_ADMIN";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Roles & Permissions</h2>
          <p className="text-xs text-[var(--foreground-muted)]">
            Changes affect all users with the selected role
          </p>
        </div>
        {dirty && (
          <Button size="sm" onClick={handleSave} disabled={isPending || isSuperAdmin}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </Button>
        )}
      </div>

      {toast && (
        <div className="rounded-lg bg-[var(--success-subtle)] px-3 py-2 text-xs text-[var(--success)]">
          {toast}
        </div>
      )}

      {/* Role selector cards */}
      <div className="flex gap-3">
        {ROLES_ORDER.map((role) => (
          <button
            key={role}
            onClick={() => { setActiveRole(role); setDirty(false); }}
            className={cn(
              "flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
              activeRole === role
                ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                : "border-[var(--border)] hover:bg-[var(--background-subtle)]"
            )}
          >
            <ShieldCheck className={cn("h-4 w-4", activeRole === role ? "text-[var(--accent)]" : "text-[var(--foreground-muted)]")} />
            <div>
              <p className="text-xs font-semibold">{ROLE_LABELS[role]}</p>
              <p className="text-[10px] text-[var(--foreground-muted)]">
                {(permMap[role] ?? []).length} permissions
              </p>
            </div>
          </button>
        ))}
      </div>

      {isSuperAdmin && (
        <div className="rounded-lg border border-[var(--warning)] bg-[var(--warning-subtle)] px-3 py-2 text-xs text-[var(--warning)]">
          Super Admin has all permissions and cannot be modified.
        </div>
      )}

      {/* Permission matrix */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--foreground-muted)]" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                <th className="px-4 py-2.5 text-left font-semibold text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
                  Feature
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {FEATURES.map(({ label, perms }) => (
                <tr key={label} className="hover:bg-[var(--background-subtle)] transition-colors">
                  <td className="px-4 py-3 font-medium">{label}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      {perms.map(({ action, perm }) => (
                        <div key={perm} className="flex items-center gap-1.5">
                          <PermCell
                            allowed={currentPerms.includes(perm)}
                            locked={isSuperAdmin}
                            onToggle={() => toggle(perm)}
                          />
                          <span className="text-[var(--foreground-muted)]">{action}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SecondAdminConfirmDialog
        open={confirmOpen}
        title={`Update permissions for ${ROLE_LABELS[activeRole]}`}
        description="Changing permissions affects all users with this role immediately. A second Super Admin must confirm."
        onConfirmed={onConfirmed}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
