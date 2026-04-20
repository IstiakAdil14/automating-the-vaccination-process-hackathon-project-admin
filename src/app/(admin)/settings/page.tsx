import { requireRole } from "@/lib/getAdminSession";
import { ROLES } from "@/lib/permissions";
import { SettingsShell } from "@/components/admin/settings/SettingsShell";

export default async function SettingsPage() {
  await requireRole([ROLES.SUPER_ADMIN]);
  return <SettingsShell />;
}
