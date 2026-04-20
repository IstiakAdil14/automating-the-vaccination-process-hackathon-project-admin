import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Center } from "@/models/Center";
import { Staff } from "@/models/Staff";
import { Inventory } from "@/models/Inventory";
import { VaccinationRecord } from "@/models/VaccinationRecord";
import { FraudAlert } from "@/models/FraudAlert";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const center = await Center.findById(id).lean();
  if (!center) return NextResponse.json({ error: "Not found" }, { status: 404 });

  /* 30-day daily trend */
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [staff, inventory, trend, fraudCount] = await Promise.all([
    Staff.find({ centerId: id }).lean(),
    Inventory.find({ centerId: id }).populate("vaccineId", "name shortName").lean(),
    VaccinationRecord.aggregate([
      { $match: { centerId: center._id, administeredAt: { $gte: since } } },
      {
        $group: {
          _id:   { $dateToString: { format: "%Y-%m-%d", date: "$administeredAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    FraudAlert.countDocuments({ centerId: id, status: "OPEN" }),
  ]);

  return NextResponse.json({ center, staff, inventory, trend, fraudCount });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  await connectDB();
  const center = await Center.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true }).lean();
  if (!center) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: center });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  await Center.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
