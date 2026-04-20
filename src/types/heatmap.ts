import type { HeatmapFilters, CenterMapPin, HeatmapPoint, UnderservedArea } from "@/app/actions/heatmap";

export type { HeatmapFilters, CenterMapPin, HeatmapPoint, UnderservedArea };

/* --- Map constants ------------------------------------------------------------ */
export const BD_BOUNDS = {
  north: 26.6, south: 20.7, east: 92.7, west: 88.0,
} as const;

export const BD_CENTER = { lat: 23.685, lng: 90.356 } as const;

export const MAP_DEFAULT_ZOOM   = 7;
export const MAP_DIVISION_ZOOM  = 9;
export const MAP_DISTRICT_ZOOM  = 11;
export const MAP_UPAZILA_ZOOM   = 13;

/* --- Heatmap gradient --------------------------------------------------------- */
export const HEATMAP_GRADIENT = [
  "rgba(239,68,68,0)",      /* transparent red - zero weight */
  "rgba(239,68,68,1)",      /* red   - <40% */
  "rgba(245,158,11,1)",     /* amber - 40-70% */
  "rgba(16,185,129,1)",     /* green - >70% */
];

/* --- Center pin colors -------------------------------------------------------- */
export const CENTER_PIN_COLORS: Record<string, string> = {
  GOVT_HOSPITAL:  "#3B82F6",   /* blue */
  PRIVATE_CLINIC: "#8B5CF6",   /* purple */
  COMMUNITY:      "#10B981",   /* green */
  MOBILE:         "#F59E0B",   /* orange */
};

export const CENTER_PIN_LABELS: Record<string, string> = {
  GOVT_HOSPITAL:  "Government Hospital",
  PRIVATE_CLINIC: "Private Clinic",
  COMMUNITY:      "Community Center",
  MOBILE:         "Mobile Unit",
};

/* --- Layer toggle state ------------------------------------------------------- */
export interface LayerState {
  heatmap:     boolean;
  centerPins:  boolean;
  underserved: boolean;
}

/* --- Drill-down breadcrumb ---------------------------------------------------- */
export interface BreadcrumbLevel {
  label: string;
  level: "national" | "division" | "district";
  zoom:  number;
  center?: { lat: number; lng: number };
}

/* --- Vaccine options ---------------------------------------------------------- */
export const VACCINE_OPTIONS = [
  { value: "all",         label: "All Vaccines" },
  { value: "covid19",     label: "COVID-19" },
  { value: "hepatitis_b", label: "Hepatitis B" },
  { value: "measles",     label: "Measles (MMR)" },
  { value: "bcg",         label: "BCG" },
  { value: "opv",         label: "OPV" },
  { value: "dpt",         label: "DPT" },
] as const;

export const AGE_GROUP_OPTIONS = [
  { value: "all",     label: "All Ages" },
  { value: "child",   label: "Child (0-12)" },
  { value: "teen",    label: "Teen (13-17)" },
  { value: "adult",   label: "Adult (18-59)" },
  { value: "elderly", label: "Elderly (60+)" },
] as const;

export const GENDER_OPTIONS = [
  { value: "all",    label: "All Genders" },
  { value: "MALE",   label: "Male" },
  { value: "FEMALE", label: "Female" },
] as const;
