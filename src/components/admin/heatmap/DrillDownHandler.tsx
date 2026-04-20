"use client";

import { motion } from "framer-motion";
import { ChevronRight, Home, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAP_DEFAULT_ZOOM, MAP_DIVISION_ZOOM, MAP_DISTRICT_ZOOM,
  type BreadcrumbLevel,
} from "@/types/heatmap";

interface DrillDownHandlerProps {
  breadcrumbs: BreadcrumbLevel[];
  onNavigate:  (index: number) => void;
}

export function DrillDownBreadcrumb({ breadcrumbs, onNavigate }: DrillDownHandlerProps) {
  const canGoBack = breadcrumbs.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-lg"
    >
      {/* Back button */}
      {canGoBack && (
        <button
          onClick={() => onNavigate(breadcrumbs.length - 2)}
          className="mr-1 flex h-6 w-6 items-center justify-center rounded-lg text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Crumbs */}
      {breadcrumbs.map((crumb, i) => {
        const isLast = i === breadcrumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i === 0 && <Home className="h-3 w-3 text-[var(--foreground-muted)]" />}
            {i > 0 && <ChevronRight className="h-3 w-3 text-[var(--foreground-subtle)]" />}
            <button
              onClick={() => !isLast && onNavigate(i)}
              className={cn(
                "text-xs font-medium transition-colors",
                isLast
                  ? "text-[var(--foreground)] cursor-default"
                  : "text-[var(--foreground-muted)] hover:text-[var(--health-green-500)]"
              )}
            >
              {crumb.label}
            </button>
          </span>
        );
      })}
    </motion.div>
  );
}

/* --- Hook: manages drill-down state ------------------------------------------ */
export function useDrillDown() {
  const initial: BreadcrumbLevel = {
    label:  "National",
    level:  "national",
    zoom:   MAP_DEFAULT_ZOOM,
    center: { lat: 23.685, lng: 90.356 },
  };

  return {
    buildDivisionCrumb: (division: string, lat: number, lng: number): BreadcrumbLevel => ({
      label:  `${division} Division`,
      level:  "division",
      zoom:   MAP_DIVISION_ZOOM,
      center: { lat, lng },
    }),
    buildDistrictCrumb: (district: string, lat: number, lng: number): BreadcrumbLevel => ({
      label:  `${district} District`,
      level:  "district",
      zoom:   MAP_DISTRICT_ZOOM,
      center: { lat, lng },
    }),
    initial,
  };
}
