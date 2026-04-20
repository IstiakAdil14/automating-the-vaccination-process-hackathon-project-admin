import type { AdminRole, Permission } from "@/lib/permissions";

/* --- Auth --------------------------------------------------------------------- */
export type { AdminRole, Permission };

export interface AdminSessionUser {
  id:          string;
  name:        string;
  email:       string;
  role:        AdminRole;
  permissions: Permission[];
  division?:   string;
  lastLogin?:  string;
}

/* --- Admin (DB shape) --------------------------------------------------------- */
export interface AdminUser {
  _id:         string;
  name:        string;
  email:       string;
  role:        AdminRole;
  permissions: Permission[];
  division?:   string;
  district?:   string;
  isActive:    boolean;
  lastLogin?:  string;
  createdAt:   string;
}

/* --- Center ------------------------------------------------------------------- */
export type CenterType   = "GOVT_HOSPITAL" | "PRIVATE_CLINIC" | "COMMUNITY" | "MOBILE";
export type CenterStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export interface Center {
  _id:        string;
  centerId:   string;
  name:       string;
  licenseNo:  string;
  type:       CenterType;
  geoLat:     number;
  geoLng:     number;
  address: {
    division: string;
    district: string;
    upazila:  string;
    full:     string;
  };
  contact: {
    name:   string;
    phone:  string;
    email?: string;
  };
  status:            CenterStatus;
  dailyCapacity:     number;
  totalVaccinations: number;
  approvedAt?:       string;
  createdAt:         string;
}

/* --- Staff -------------------------------------------------------------------- */
export type StaffRole = "VACCINATOR" | "RECEPTIONIST" | "SUPERVISOR";

export interface Staff {
  _id:               string;
  staffId:           string;
  nid:               string;
  name:              string;
  role:              StaffRole;
  centerId:          string;
  phone:             string;
  email:             string;
  isActive:          boolean;
  isSuspended:       boolean;
  shiftsWorked:      number;
  totalVaccinations: number;
  lastActive?:       string;
  createdAt:         string;
}

/* --- Citizen / User ----------------------------------------------------------- */
export type VaccinationStatus = "UNVACCINATED" | "PARTIAL" | "COMPLETE";
export type Gender             = "MALE" | "FEMALE" | "OTHER";

export interface Citizen {
  _id:    string;
  userId: string;
  nid:    string;
  name:   string;
  phone:  string;
  email?: string;
  dateOfBirth:       string;
  gender:            Gender;
  address: {
    division: string;
    district: string;
    upazila:  string;
    full?:    string;
  };
  isVerified:        boolean;
  isSuspended:       boolean;
  vaccinationStatus: VaccinationStatus;
  createdAt:         string;
}

/* --- Vaccine ------------------------------------------------------------------ */
export interface Vaccine {
  _id:       string;
  vaccineId: string;
  name:      string;
  shortName: string;
  whoCode?:  string;
  schedule: {
    doses:        number;
    intervalDays: number[];
  };
  ageEligibility: {
    minYears:  number;
    maxYears?: number;
  };
  contraindications: string[];
  isActive:          boolean;
}

/* --- VaccinationRecord -------------------------------------------------------- */
export type SyncStatus = "ONLINE" | "OFFLINE_PENDING";

export interface VaccinationRecord {
  _id:            string;
  recordId:       string;
  userId:         string;
  centerId:       string;
  staffId:        string;
  vaccineId:      string;
  doseNumber:     number;
  batchNo:        string;
  lotNo:          string;
  expiryDate:     string;
  administeredAt: string;
  syncStatus:     SyncStatus;
  notes?:         string;
}

/* --- Inventory ---------------------------------------------------------------- */
export interface InventoryItem {
  _id:               string;
  inventoryId:       string;
  centerId:          string;
  vaccineId:         string;
  quantityOnHand:    number;
  dosesAdministered: number;
  expiryDate:        string;
  batchNo:           string;
  lowStockThreshold: number;
  receivedAt:        string;
  isLowStock:        boolean;
  isExpired:         boolean;
}

/* --- FraudAlert --------------------------------------------------------------- */
export type FraudType     = "DUPLICATE_NID" | "TAMPERED_QR" | "MULTI_LOCATION" | "INVALID_BATCH";
export type FraudSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FraudStatus   = "OPEN" | "INVESTIGATING" | "RESOLVED" | "FALSE_POSITIVE";

export interface FraudAlert {
  _id:         string;
  alertId:     string;
  type:        FraudType;
  severity:    FraudSeverity;
  userId?:     string;
  centerId:    string;
  staffId?:    string;
  details:     Record<string, unknown>;
  status:      FraudStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt:   string;
}

/* --- Notification ------------------------------------------------------------- */
export type NotifChannel = "SMS" | "EMAIL" | "IN_APP";
export type NotifStatus  = "DRAFT" | "SCHEDULED" | "SENT";

export interface Notification {
  _id:       string;
  notifId:   string;
  createdBy: string;
  title:     string;
  body:      string;
  channels:  NotifChannel[];
  targetAudience: {
    roles:              string[];
    divisions:          string[];
    vaccinationStatus?: string;
  };
  scheduledAt?: string;
  sentAt?:      string;
  deliveryStats: {
    sent:      number;
    delivered: number;
    failed:    number;
    opened:    number;
  };
  status:    NotifStatus;
  createdAt: string;
}

/* --- Dashboard stats ---------------------------------------------------------- */
export interface DashboardStats {
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
