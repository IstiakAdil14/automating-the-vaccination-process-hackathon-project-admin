"use server";

import { connectDB } from "@/lib/db";
import { User, VACCINATION_STATUS } from "@/models/User";
import { Center, CENTER_STATUS, CENTER_TYPES } from "@/models/Center";
import { VaccinationRecord } from "@/models/VaccinationRecord";
import type { CenterType } from "@/types";

/* --- Shared types ------------------------------------------------------------- */
export interface HeatmapFilters {
  vaccineId?:  string;          /* "all" or specific vaccineId */
  ageGroup?:   "all" | "child" | "teen" | "adult" | "elderly";
  gender?:     "all" | "MALE" | "FEMALE";
  dateFrom?:   string;          /* ISO date string */
  dateTo?:     string;
  division?:   string;
  district?:   string;
}

export interface HeatmapPoint {
  lat:    number;
  lng:    number;
  weight: number;   /* 0-1, normalised coverage % */
}

export interface CenterMapPin {
  centerId:          string;
  name:              string;
  type:              CenterType;
  lat:               number;
  lng:               number;
  status:            string;
  dailyCapacity:     number;
  totalVaccinations: number;
  vaccinationsToday: number;
  slotsRemaining:    number;
  address: {
    division: string;
    district: string;
    upazila:  string;
    full:     string;
  };
  contact: { name: string; phone: string; email?: string };
}

export interface UnderservedArea {
  id:         string;
  name:       string;
  level:      "division" | "district" | "upazila";
  coverage:   number;
  population: number;
  /* Simplified bounding box used to draw a rectangle overlay */
  bounds: { north: number; south: number; east: number; west: number };
}

/* --- Age group - birth year range -------------------------------------------- */
function ageGroupToBirthRange(group: HeatmapFilters["ageGroup"]): { min: Date; max: Date } | null {
  const now = new Date();
  const yr  = now.getFullYear();
  const map: Record<string, [number, number]> = {
    child:   [yr - 12, yr],
    teen:    [yr - 17, yr - 13],
    adult:   [yr - 59, yr - 18],
    elderly: [yr - 120, yr - 60],
  };
  if (!group || group === "all" || !map[group]) return null;
  const [minYr, maxYr] = map[group];
  return {
    min: new Date(minYr, 0, 1),
    max: new Date(maxYr, 11, 31),
  };
}

/* --- Date range helper ------------------------------------------------------- */
function buildDateRange(filters: HeatmapFilters): Record<string, Date> | null {
  if (!filters.dateFrom && !filters.dateTo) return null;
  const range: Record<string, Date> = {};
  if (filters.dateFrom) range.$gte = new Date(filters.dateFrom);
  if (filters.dateTo)   range.$lte = new Date(filters.dateTo + "T23:59:59.999Z");
  return range;
}

/* --- 1. getHeatmapData -------------------------------------------------------- */
export async function getHeatmapData(filters: HeatmapFilters): Promise<HeatmapPoint[]> {
  await connectDB();

  /* If date range set, scope to users vaccinated in that period */
  const dateRange = buildDateRange(filters);
  let scopedUserIds: string[] | null = null;
  if (dateRange) {
    const records = await VaccinationRecord.find(
      { administeredAt: dateRange },
      { userId: 1 }
    ).lean();
    scopedUserIds = [...new Set(records.map((r) => r.userId.toString()))];
  }

  /* Build user match */
  const userMatch: Record<string, unknown> = {};
  if (filters.gender && filters.gender !== "all") userMatch.gender = filters.gender;
  if (filters.division) userMatch["address.division"] = filters.division;
  if (filters.district) userMatch["address.district"] = filters.district;
  if (scopedUserIds)    userMatch._id = { $in: scopedUserIds };

  const ageRange = ageGroupToBirthRange(filters.ageGroup);
  if (ageRange) {
    userMatch.dateOfBirth = { $gte: ageRange.min, $lte: ageRange.max };
  }

  /* Aggregate coverage per upazila */
  const rows = await User.aggregate([
    { $match: userMatch },
    {
      $group: {
        _id:        { division: "$address.division", district: "$address.district", upazila: "$address.upazila" },
        total:      { $sum: 1 },
        vaccinated: {
          $sum: {
            $cond: [
              { $in: ["$vaccinationStatus", [VACCINATION_STATUS.COMPLETE, VACCINATION_STATUS.PARTIAL]] },
              1, 0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id:      1,
        coverage: { $divide: ["$vaccinated", { $max: ["$total", 1] }] },
      },
    },
  ]);

  /* Join with center geo-coordinates - use center centroid per upazila */
  const centerRows = await Center.aggregate([
    { $match: { status: CENTER_STATUS.ACTIVE } },
    {
      $group: {
        _id:    { division: "$address.division", district: "$address.district", upazila: "$address.upazila" },
        avgLat: { $avg: "$geoLat" },
        avgLng: { $avg: "$geoLng" },
      },
    },
  ]);

  const geoMap = new Map<string, { lat: number; lng: number }>();
  for (const c of centerRows) {
    const key = `${c._id.division}|${c._id.district}|${c._id.upazila}`;
    geoMap.set(key, { lat: c.avgLat, lng: c.avgLng });
  }

  const points: HeatmapPoint[] = [];
  for (const row of rows) {
    const key = `${row._id.division}|${row._id.district}|${row._id.upazila}`;
    const geo = geoMap.get(key);
    if (!geo) continue;
    points.push({ lat: geo.lat, lng: geo.lng, weight: row.coverage });
  }

  return points;
}

/* --- 2. getCenterLocations ---------------------------------------------------- */
export async function getCenterLocations(filters: HeatmapFilters): Promise<CenterMapPin[]> {
  await connectDB();

  const match: Record<string, unknown> = { status: CENTER_STATUS.ACTIVE };
  if (filters.division) match["address.division"] = filters.division;
  if (filters.district) match["address.district"] = filters.district;

  const centers = await Center.find(match).lean();

  /* Use date range if set, otherwise default to today */
  const dateRange = buildDateRange(filters);
  const countMatch: Record<string, unknown> = {};
  if (dateRange) {
    countMatch.administeredAt = dateRange;
  } else {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    countMatch.administeredAt = { $gte: todayStart };
  }

  const todayCounts = await VaccinationRecord.aggregate([
    { $match: countMatch },
    { $group: { _id: "$centerId", count: { $sum: 1 } } },
  ]);

  const todayMap = new Map<string, number>(
    todayCounts.map((r) => [r._id.toString(), r.count])
  );

  return centers.map((c) => {
    const today = todayMap.get(c._id.toString()) ?? 0;
    return {
      centerId:          c.centerId,
      name:              c.name,
      type:              c.type,
      lat:               c.geoLat,
      lng:               c.geoLng,
      status:            c.status,
      dailyCapacity:     c.dailyCapacity,
      totalVaccinations: c.totalVaccinations,
      vaccinationsToday: today,
      slotsRemaining:    Math.max(0, c.dailyCapacity - today),
      address:           c.address,
      contact:           c.contact,
    };
  });
}

/* --- 3. getUnderservedAreas --------------------------------------------------- */
/* Approximate bounding boxes for Bangladesh divisions */
const DIVISION_BOUNDS: Record<string, { north: number; south: number; east: number; west: number }> = {
  Dhaka:       { north: 24.4, south: 23.4, east: 91.0, west: 89.8 },
  Chittagong:  { north: 23.5, south: 20.7, east: 92.7, west: 91.0 },
  Sylhet:      { north: 25.2, south: 24.0, east: 92.5, west: 91.5 },
  Rajshahi:    { north: 25.0, south: 24.0, east: 89.5, west: 88.0 },
  Khulna:      { north: 23.2, south: 21.8, east: 89.9, west: 88.7 },
  Barisal:     { north: 23.0, south: 21.8, east: 90.8, west: 89.8 },
  Rangpur:     { north: 26.6, south: 25.0, east: 89.5, west: 88.5 },
  Mymensingh:  { north: 25.2, south: 24.2, east: 91.0, west: 89.8 },
};

/* --- 4. getDivisionBreakdown ------------------------------------------------- */
export interface DivisionBreakdownRow {
  division:          string;
  totalCitizens:     number;
  vaccinated:        number;
  partial:           number;
  coveragePercent:   number;
  activeCenters:     number;
  totalVaccinations: number;
}

export async function getDivisionBreakdown(): Promise<DivisionBreakdownRow[]> {
  await connectDB();

  const [citizenStats, centerStats, vaccinationStats] = await Promise.all([
    User.aggregate([
      { $group: { _id: "$address.division", total: { $sum: 1 }, vaccinated: { $sum: { $cond: [{ $eq: ["$vaccinationStatus", VACCINATION_STATUS.COMPLETE] }, 1, 0] } }, partial: { $sum: { $cond: [{ $eq: ["$vaccinationStatus", VACCINATION_STATUS.PARTIAL] }, 1, 0] } } } },
    ]),
    Center.aggregate([
      { $match: { status: CENTER_STATUS.ACTIVE } },
      { $group: { _id: "$address.division", activeCenters: { $sum: 1 } } },
    ]),
    Center.aggregate([
      { $group: { _id: "$address.division", totalVaccinations: { $sum: "$totalVaccinations" } } },
    ]),
  ]);

  const map = new Map<string, DivisionBreakdownRow>();
  for (const r of citizenStats) {
    map.set(r._id, { division: r._id, totalCitizens: r.total, vaccinated: r.vaccinated, partial: r.partial, coveragePercent: r.total > 0 ? Math.round(((r.vaccinated + r.partial) / r.total) * 1000) / 10 : 0, activeCenters: 0, totalVaccinations: 0 });
  }
  for (const r of centerStats) { const e = map.get(r._id); if (e) e.activeCenters = r.activeCenters; }
  for (const r of vaccinationStats) { const e = map.get(r._id); if (e) e.totalVaccinations = r.totalVaccinations; }

  return Array.from(map.values()).sort((a, b) => b.totalVaccinations - a.totalVaccinations);
}

export async function getUnderservedAreas(threshold: number): Promise<UnderservedArea[]> {
  await connectDB();

  const rows = await User.aggregate([
    {
      $group: {
        _id:        "$address.division",
        total:      { $sum: 1 },
        vaccinated: {
          $sum: {
            $cond: [
              { $in: ["$vaccinationStatus", [VACCINATION_STATUS.COMPLETE, VACCINATION_STATUS.PARTIAL]] },
              1, 0,
            ],
          },
        },
      },
    },
    {
      $project: {
        division:   "$_id",
        total:      1,
        vaccinated: 1,
        coverage:   { $multiply: [{ $divide: ["$vaccinated", { $max: ["$total", 1] }] }, 100] },
      },
    },
    { $match: { coverage: { $lt: threshold } } },
  ]);

  return rows
    .filter((r) => DIVISION_BOUNDS[r.division])
    .map((r) => ({
      id:         r.division,
      name:       r.division,
      level:      "division" as const,
      coverage:   Math.round(r.coverage * 10) / 10,
      population: r.total,
      bounds:     DIVISION_BOUNDS[r.division],
    }));
}
