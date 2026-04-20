import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/* --- In-memory notification store (replace with DB in production) ------------- */
export interface AdminNotif {
  id:        string;
  type:      "center_application" | "staff_request" | "fraud_escalation" | "restock" | "system";
  title:     string;
  body:      string;
  href:      string;
  read:      boolean;
  createdAt: string;
}

/* Shared mutable store - in production use MongoDB + Redis pub/sub */
export const notifStore: AdminNotif[] = [
  {
    id: "n1", type: "fraud_escalation",
    title: "Critical Fraud Alert",
    body:  "Duplicate NID detected at Dhaka Medical Center",
    href:  "/fraud",
    read:  false,
    createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: "n2", type: "center_application",
    title: "New Center Application",
    body:  "Chittagong Community Clinic applied for registration",
    href:  "/centers",
    read:  false,
    createdAt: new Date(Date.now() - 15 * 60_000).toISOString(),
  },
  {
    id: "n3", type: "restock",
    title: "Low Stock Alert",
    body:  "BCG vaccine below threshold at 3 centers",
    href:  "/supply",
    read:  false,
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  },
  {
    id: "n4", type: "staff_request",
    title: "Staff Request Pending",
    body:  "Sylhet Vaccination Center requested 2 additional vaccinators",
    href:  "/staff",
    read:  true,
    createdAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
  },
  {
    id: "n5", type: "system",
    title: "System Health Warning",
    body:  "DB latency spike detected (>500ms) - resolved",
    href:  "/dashboard",
    read:  true,
    createdAt: new Date(Date.now() - 6 * 60 * 60_000).toISOString(),
  },
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    notifications: notifStore.slice(0, 10),
    unread:        notifStore.filter((n) => !n.read).length,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, id } = await req.json() as { action: "mark_read" | "mark_all_read"; id?: string };

  if (action === "mark_all_read") {
    notifStore.forEach((n) => { n.read = true; });
  } else if (action === "mark_read" && id) {
    const n = notifStore.find((n) => n.id === id);
    if (n) n.read = true;
  }

  return NextResponse.json({ ok: true });
}
