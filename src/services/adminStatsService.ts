import { connectDB } from "@/lib/db";
import { User, VACCINATION_STATUS } from "@/models/User";
import { Center, CENTER_STATUS } from "@/models/Center";
import { Staff } from "@/models/Staff";
import { VaccinationRecord } from "@/models/VaccinationRecord";
import { Inventory } from "@/models/Inventory";
import { FraudAlert, FRAUD_STATUS } from "@/models/FraudAlert";

/* --- Return types ------------------------------------------------------------- */
export interface NationalKPIs {
  totalCitizens:         number;
  totalVaccinated:       number;
  totalPartial:          number;
  coveragePercent:       number;
  totalCenters:          number;
  activeCenters:         number;
  totalStaff:            number;
  activeStaff:           number;
  vaccinationsToday:     number;
  vaccinationsThisWeek:  number;
  vaccinationsThisMonth: number;
  lowStockAlerts:        number;
  openFraudAlerts:       number;
  criticalFraudAlerts:   number;
}

export interface DivisionBreakdownRow {
  division:          string;
  totalCitizens:     number;
  vaccinated:        number;
  partial:           number;
  coveragePercent:   number;
  activeCenters:     number;
  totalVaccinations: number;
}

export interface DailyTrendRow {
  date:  string;   /* "YYYY-MM-DD" */
  count: number;
}

export interface VaccineDistributionRow {
  vaccineId:   string;
  vaccineName: string;
  shortName:   string;
  totalDoses:  number;
  percent:     number;
}

export interface CoverageByDivisionRow {
  division:        string;
  coveragePercent: number;
  vaccinated:      number;
  total:           number;
}

/* --- Helpers ------------------------------------------------------------------ */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

/* --- 1. getNationalKPIs ------------------------------------------------------- */
export async function getNationalKPIs(): Promise<NationalKPIs> {
  await connectDB();

  const now       = new Date();
  const todayStart = startOfDay(now);
  const weekStart  = daysAgo(7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCitizens,
    totalVaccinated,
    totalPartial,
    totalCenters,
    activeCenters,
    totalStaff,
    activeStaff,
    vaccinationsToday,
    vaccinationsThisWeek,
    vaccinationsThisMonth,
    lowStockAlerts,
    openFraudAlerts,
    criticalFraudAlerts,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ vaccinationStatus: VACCINATION_STATUS.COMPLETE }),
    User.countDocuments({ vaccinationStatus: VACCINATION_STATUS.PARTIAL }),
    Center.countDocuments(),
    Center.countDocuments({ status: CENTER_STATUS.ACTIVE }),
    Staff.countDocuments(),
    Staff.countDocuments({ isActive: true }),
    VaccinationRecord.countDocuments({ administeredAt: { $gte: todayStart } }),
    VaccinationRecord.countDocuments({ administeredAt: { $gte: weekStart } }),
    VaccinationRecord.countDocuments({ administeredAt: { $gte: monthStart } }),
    Inventory.countDocuments({
      $expr: { $lte: ["$quantityOnHand", "$lowStockThreshold"] },
      expiryDate: { $gt: now },
    }),
    FraudAlert.countDocuments({ status: FRAUD_STATUS.OPEN }),
    FraudAlert.countDocuments({ status: FRAUD_STATUS.OPEN, severity: "CRITICAL" }),
  ]);

  const coveragePercent = totalCitizens > 0
    ? Math.round(((totalVaccinated + totalPartial) / totalCitizens) * 100 * 10) / 10
    : 0;

  return {
    totalCitizens,
    totalVaccinated,
    totalPartial,
    coveragePercent,
    totalCenters,
    activeCenters,
    totalStaff,
    activeStaff,
    vaccinationsToday,
    vaccinationsThisWeek,
    vaccinationsThisMonth,
    lowStockAlerts,
    openFraudAlerts,
    criticalFraudAlerts,
  };
}

/* --- 2. getDivisionBreakdown -------------------------------------------------- */
export async function getDivisionBreakdown(): Promise<DivisionBreakdownRow[]> {
  await connectDB();

  const [citizenStats, centerStats, vaccinationStats] = await Promise.all([
    /* Citizens grouped by division */
    User.aggregate([
      {
        $group: {
          _id:         "$address.division",
          total:       { $sum: 1 },
          vaccinated:  { $sum: { $cond: [{ $eq: ["$vaccinationStatus", VACCINATION_STATUS.COMPLETE] }, 1, 0] } },
          partial:     { $sum: { $cond: [{ $eq: ["$vaccinationStatus", VACCINATION_STATUS.PARTIAL] }, 1, 0] } },
        },
      },
    ]),

    /* Active centers per division */
    Center.aggregate([
      { $match: { status: CENTER_STATUS.ACTIVE } },
      { $group: { _id: "$address.division", activeCenters: { $sum: 1 } } },
    ]),

    /* Total vaccinations per division via center lookup */
    Center.aggregate([
      {
        $group: {
          _id:               "$address.division",
          totalVaccinations: { $sum: "$totalVaccinations" },
        },
      },
    ]),
  ]);

  /* Merge by division */
  const divisionMap = new Map<string, DivisionBreakdownRow>();

  for (const row of citizenStats) {
    const div = row._id as string;
    divisionMap.set(div, {
      division:          div,
      totalCitizens:     row.total,
      vaccinated:        row.vaccinated,
      partial:           row.partial,
      coveragePercent:   row.total > 0
        ? Math.round(((row.vaccinated + row.partial) / row.total) * 100 * 10) / 10
        : 0,
      activeCenters:     0,
      totalVaccinations: 0,
    });
  }

  for (const row of centerStats) {
    const existing = divisionMap.get(row._id as string);
    if (existing) existing.activeCenters = row.activeCenters;
  }

  for (const row of vaccinationStats) {
    const existing = divisionMap.get(row._id as string);
    if (existing) existing.totalVaccinations = row.totalVaccinations;
  }

  return Array.from(divisionMap.values()).sort((a, b) =>
    b.totalVaccinations - a.totalVaccinations
  );
}

/* --- 3. getDailyVaccinationTrend ---------------------------------------------- */
export async function getDailyVaccinationTrend(days = 30): Promise<DailyTrendRow[]> {
  await connectDB();

  const since = daysAgo(days);

  const raw = await VaccinationRecord.aggregate([
    { $match: { administeredAt: { $gte: since } } },
    {
      $group: {
        _id: {
          year:  { $year:       "$administeredAt" },
          month: { $month:      "$administeredAt" },
          day:   { $dayOfMonth: "$administeredAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  /* Fill in zero-count days so the chart has no gaps */
  const resultMap = new Map<string, number>();
  for (const row of raw) {
    const key = `${row._id.year}-${String(row._id.month).padStart(2, "0")}-${String(row._id.day).padStart(2, "0")}`;
    resultMap.set(key, row.count);
  }

  const trend: DailyTrendRow[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d   = daysAgo(i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    trend.push({ date: key, count: resultMap.get(key) ?? 0 });
  }

  return trend;
}

/* --- 4. getVaccineTypeDistribution ------------------------------------------- */
export async function getVaccineTypeDistribution(): Promise<VaccineDistributionRow[]> {
  await connectDB();

  const raw = await VaccinationRecord.aggregate([
    {
      $group: {
        _id:        "$vaccineId",
        totalDoses: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from:         "vaccines",
        localField:   "_id",
        foreignField: "_id",
        as:           "vaccine",
      },
    },
    { $unwind: { path: "$vaccine", preserveNullAndEmptyArrays: false } },
    { $sort: { totalDoses: -1 } },
  ]);

  const grandTotal = raw.reduce((sum, r) => sum + r.totalDoses, 0);

  return raw.map((r) => ({
    vaccineId:   r._id.toString(),
    vaccineName: r.vaccine.name as string,
    shortName:   r.vaccine.shortName as string,
    totalDoses:  r.totalDoses as number,
    percent:     grandTotal > 0
      ? Math.round((r.totalDoses / grandTotal) * 100 * 10) / 10
      : 0,
  }));
}

/* --- 5. getCoverageByDivision ------------------------------------------------- */
export async function getCoverageByDivision(): Promise<CoverageByDivisionRow[]> {
  await connectDB();

  const rows = await User.aggregate([
    {
      $group: {
        _id:        "$address.division",
        total:      { $sum: 1 },
        vaccinated: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$vaccinationStatus",
                  [VACCINATION_STATUS.COMPLETE, VACCINATION_STATUS.PARTIAL],
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id:             0,
        division:        "$_id",
        total:           1,
        vaccinated:      1,
        coveragePercent: {
          $round: [
            { $multiply: [{ $divide: ["$vaccinated", { $max: ["$total", 1] }] }, 100] },
            1,
          ],
        },
      },
    },
    { $sort: { coveragePercent: -1 } },
  ]);

  return rows as CoverageByDivisionRow[];
}
