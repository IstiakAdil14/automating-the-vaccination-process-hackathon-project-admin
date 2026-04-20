"use server";

import {
  getNationalKPIs,
  getDivisionBreakdown,
  getDailyVaccinationTrend,
  getVaccineTypeDistribution,
  type NationalKPIs,
  type DivisionBreakdownRow,
  type DailyTrendRow,
  type VaccineDistributionRow,
} from "@/services/adminStatsService";
import { connectDB } from "@/lib/db";
import { Center, CENTER_STATUS } from "@/models/Center";
import { Staff } from "@/models/Staff";
import { FraudAlert, FRAUD_STATUS, FRAUD_SEVERITY } from "@/models/FraudAlert";
import { Inventory } from "@/models/Inventory";

/* --- Types -------------------------------------------------------------------- */
export interface PendingApprovals {
  centerApplications: number;
  staffRequests:      number;
  restockRequests:    number;
  fraudEscalations:   number;
}

export interface SystemHealth {
  dbLatencyMs:       number;
  offlineSyncQueue:  number;
  activeSessions:    number;
  lastRefreshedAt:   string;
}

export interface DashboardData {
  kpis:              NationalKPIs;
  divisionBreakdown: DivisionBreakdownRow[];
  dailyTrend:        DailyTrendRow[];
  vaccineDistrib:    VaccineDistributionRow[];
  pendingApprovals:  PendingApprovals;
  systemHealth:      SystemHealth;
  fetchedAt:         string;
}

/* --- Main action -------------------------------------------------------------- */
export async function getDashboardData(): Promise<DashboardData> {
  const t0 = Date.now();

  const [kpis, divisionBreakdown, dailyTrend, vaccineDistrib, approvals] =
    await Promise.all([
      getNationalKPIs(),
      getDivisionBreakdown(),
      getDailyVaccinationTrend(30),
      getVaccineTypeDistribution(),
      getPendingApprovals(),
    ]);

  const dbLatencyMs = Date.now() - t0;

  return {
    kpis,
    divisionBreakdown,
    dailyTrend,
    vaccineDistrib,
    pendingApprovals: approvals,
    systemHealth: {
      dbLatencyMs,
      offlineSyncQueue: 0,   /* populated by worker in production */
      activeSessions:   0,   /* populated by session store in production */
      lastRefreshedAt:  new Date().toISOString(),
    },
    fetchedAt: new Date().toISOString(),
  };
}

async function getPendingApprovals(): Promise<PendingApprovals> {
  await connectDB();
  const now = new Date();

  const [centerApplications, staffRequests, restockRequests, fraudEscalations] =
    await Promise.all([
      Center.countDocuments({ status: CENTER_STATUS.PENDING }),
      Staff.countDocuments({ isActive: false, isSuspended: false }),
      Inventory.countDocuments({
        $expr: { $lte: ["$quantityOnHand", "$lowStockThreshold"] },
        expiryDate: { $gt: now },
      }),
      FraudAlert.countDocuments({
        status:   FRAUD_STATUS.OPEN,
        severity: FRAUD_SEVERITY.CRITICAL,
      }),
    ]);

  return { centerApplications, staffRequests, restockRequests, fraudEscalations };
}

/* --- Lightweight health-check action (polled every 30s) ---------------------- */
export async function getSystemHealth(): Promise<SystemHealth> {
  const t0 = Date.now();
  await connectDB();
  return {
    dbLatencyMs:      Date.now() - t0,
    offlineSyncQueue: 0,
    activeSessions:   0,
    lastRefreshedAt:  new Date().toISOString(),
  };
}
