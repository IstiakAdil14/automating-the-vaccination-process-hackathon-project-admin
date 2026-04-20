import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/layout/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string })?.role ?? "admin";
  const roleLabel = role === "SUPER_ADMIN" ? "Super Admin" : role === "NATIONAL_ADMIN" ? "National Admin" : "Division Admin";

  return (
    <AdminShell userEmail={session.user?.email} userRole={roleLabel}>
      {children}
    </AdminShell>
  );
}
