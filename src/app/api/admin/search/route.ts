import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Center } from "@/models/Center";
import { Staff } from "@/models/Staff";
import { User } from "@/models/User";
import { ROLES } from "@/lib/permissions";

export interface SearchResult {
  id:       string;
  type:     "center" | "staff" | "citizen" | "page";
  title:    string;
  subtitle: string;
  href:     string;
}

const PAGES: SearchResult[] = [
  { id: "p-dashboard",  type: "page", title: "Dashboard",     subtitle: "National overview",          href: "/dashboard" },
  { id: "p-centers",    type: "page", title: "Centers",        subtitle: "Manage vaccination centers", href: "/centers" },
  { id: "p-staff",      type: "page", title: "Staff",          subtitle: "Manage staff accounts",      href: "/staff" },
  { id: "p-users",      type: "page", title: "Citizens",       subtitle: "Search citizen records",     href: "/users" },
  { id: "p-supply",     type: "page", title: "Supply Chain",   subtitle: "Inventory & stock",          href: "/supply" },
  { id: "p-fraud",      type: "page", title: "Fraud & Audit",  subtitle: "Fraud alerts & audit logs",  href: "/fraud" },
  { id: "p-broadcast",  type: "page", title: "Broadcast",      subtitle: "Send notifications",         href: "/broadcast" },
  { id: "p-reports",    type: "page", title: "Reports",        subtitle: "Analytics & exports",        href: "/reports" },
  { id: "p-heatmap",    type: "page", title: "Heatmap",        subtitle: "Geographic coverage map",    href: "/heatmap" },
  { id: "p-settings",   type: "page", title: "Settings",       subtitle: "System configuration",       href: "/settings" },
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  await connectDB();

  const regex = { $regex: q, $options: "i" };
  const limit = 5;

  const [centers, staff, citizens] = await Promise.all([
    Center.find({ $or: [{ name: regex }, { "address.district": regex }, { "address.division": regex }] })
      .select("centerId name address.district address.division status")
      .limit(limit)
      .lean(),

    Staff.find({ $or: [{ name: regex }, { nid: regex }, { email: regex }] })
      .select("staffId name nid role centerId")
      .limit(limit)
      .lean(),

    /* Citizens only for SUPER_ADMIN and NATIONAL_ADMIN */
    session.user.role === ROLES.SUPER_ADMIN || session.user.role === ROLES.NATIONAL_ADMIN
      ? User.find({ $or: [{ name: regex }, { nid: regex }, { phone: regex }] })
          .select("userId name nid phone")
          .limit(limit)
          .lean()
      : Promise.resolve([]),
  ]);

  /* Page results - filter by query */
  const pageResults = PAGES.filter(
    (p) =>
      p.title.toLowerCase().includes(q.toLowerCase()) ||
      p.subtitle.toLowerCase().includes(q.toLowerCase())
  );

  const results: SearchResult[] = [
    ...pageResults.slice(0, 3),
    ...centers.map((c) => ({
      id:       String(c._id),
      type:     "center" as const,
      title:    c.name,
      subtitle: `${c.address.district}, ${c.address.division} - ${c.status}`,
      href:     `/centers?highlight=${c.centerId}`,
    })),
    ...staff.map((s) => ({
      id:       String(s._id),
      type:     "staff" as const,
      title:    s.name,
      subtitle: `NID: ${s.nid} - ${s.role}`,
      href:     `/staff?highlight=${s.staffId}`,
    })),
    ...(citizens as Array<{ _id: unknown; userId: string; name: string; nid: string; phone: string }>).map((u) => ({
      id:       String(u._id),
      type:     "citizen" as const,
      title:    u.name,
      subtitle: `NID: ${u.nid} - ${u.phone}`,
      href:     `/users?highlight=${u.userId}`,
    })),
  ];

  return NextResponse.json({ results });
}
