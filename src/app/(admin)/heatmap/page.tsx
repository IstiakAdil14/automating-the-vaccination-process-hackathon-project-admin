"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { FilterPanel } from "@/components/admin/heatmap/FilterPanel";
import { LegendPanel } from "@/components/admin/heatmap/LegendPanel";
import { DrillDownBreadcrumb, useDrillDown } from "@/components/admin/heatmap/DrillDownHandler";
import { ExportButton } from "@/components/admin/heatmap/ExportButton";
import {
  getHeatmapData, getCenterLocations, getUnderservedAreas, getDivisionBreakdown,
} from "@/app/actions/heatmap";
import type { HeatmapFilters, LayerState, BreadcrumbLevel } from "@/types/heatmap";
import type { HeatmapPoint, CenterMapPin, UnderservedArea, DivisionBreakdownRow } from "@/app/actions/heatmap";

const VaccinationHeatmap = dynamic(
  () => import("@/components/admin/heatmap/VaccinationHeatmap").then((m) => m.VaccinationHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[var(--navy-950)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--health-green-500)]" />
          <p className="text-sm text-[var(--navy-400)]">Initialising map…</p>
        </div>
      </div>
    ),
  }
);

const MAP_CONTAINER_ID = "heatmap-capture-target";
const DEFAULT_THRESHOLD = 40;

export default function HeatmapPage() {
  const [filters, setFilters]     = useState<HeatmapFilters>({ vaccineId: "all", ageGroup: "all", gender: "all" });
  const [layers,  setLayers]      = useState<LayerState>({ heatmap: true, centerPins: true, underserved: false });
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbLevel[]>([]);

  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [centerPins,    setCenterPins]    = useState<CenterMapPin[]>([]);
  const [underserved,   setUnderserved]   = useState<UnderservedArea[]>([]);
  const [divisions,     setDivisions]     = useState<DivisionBreakdownRow[]>([]);
  const [isPending, startTransition]      = useTransition();

  const { initial } = useDrillDown();

  useEffect(() => {
    setBreadcrumbs([initial]);
    loadAll(filters, threshold);
    getDivisionBreakdown().then(setDivisions).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadAll(f: HeatmapFilters, t: number) {
    startTransition(async () => {
      const [pts, pins, areas] = await Promise.all([
        getHeatmapData(f),
        getCenterLocations(f),
        getUnderservedAreas(t),
      ]);
      setHeatmapPoints(pts);
      setCenterPins(pins);
      setUnderserved(areas);
    });
  }

  function handleFilterChange(f: HeatmapFilters) {
    setFilters(f);
    loadAll(f, threshold);
  }

  function handleThresholdChange(t: number) {
    setThreshold(t);
    getUnderservedAreas(t).then(setUnderserved).catch(() => {});
  }

  function toggleLayer(key: keyof LayerState) {
    setLayers((l) => ({ ...l, [key]: !l[key] }));
  }

  function handleBreadcrumbNav(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }

  const handleMapClick = useCallback((lat: number, lng: number) => {
    console.log("Map clicked:", lat, lng);
  }, []);

  return (
    /* Break out of the shell's p-4/p-6 padding and fill the remaining viewport height */
    <div className="-m-4 lg:-m-6 flex overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>

      {/* ── Left sidebar: controls ── */}
      <aside className="flex w-96 flex-shrink-0 flex-col gap-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-4">

        {/* Export */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
            Heatmap
          </span>
          <ExportButton mapContainerId={MAP_CONTAINER_ID} divisions={divisions} />
        </div>

        {/* Filters */}
        <FilterPanel filters={filters} onChange={handleFilterChange} loading={isPending} />

        {/* Legend + layers */}
        <LegendPanel
          layers={layers}
          onLayerToggle={toggleLayer}
          threshold={threshold}
          onThresholdChange={handleThresholdChange}
        />
      </aside>

      {/* ── Right: map + breadcrumb overlay ── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Map fills the entire right pane */}
        <div id={MAP_CONTAINER_ID} className="absolute inset-0">
          <VaccinationHeatmap
            containerId={MAP_CONTAINER_ID}
            heatmapPoints={heatmapPoints}
            centerPins={centerPins}
            underserved={underserved}
            layers={layers}
            breadcrumbs={breadcrumbs}
            onMapClick={handleMapClick}
          />
        </div>

        {/* Breadcrumb — floats top-left over the map only */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="pointer-events-auto">
            <DrillDownBreadcrumb breadcrumbs={breadcrumbs} onNavigate={handleBreadcrumbNav} />
          </div>
        </div>

        {/* Loading overlay — covers only the map pane */}
        {isPending && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 shadow-xl">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--health-green-500)]" />
              <span className="text-sm font-medium text-[var(--foreground)]">Updating map…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
