"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, Layers, SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
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

  const [mobilePanel, setMobilePanel] = useState<"filters" | "layers" | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const mobileFabs = mounted && createPortal(
    <>
      {/* Top bar: breadcrumb left, export right */}
      <div className="pointer-events-none fixed top-16 inset-x-0 z-[9999] flex items-start justify-between p-3 lg:hidden">
        <div className="pointer-events-auto">
          <DrillDownBreadcrumb breadcrumbs={breadcrumbs} onNavigate={handleBreadcrumbNav} />
        </div>
        <div className="pointer-events-auto">
          <ExportButton mapContainerId={MAP_CONTAINER_ID} divisions={divisions} />
        </div>
      </div>

      {/* FABs */}
      <div className="fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 gap-2 lg:hidden">
        <button
          onClick={() => setMobilePanel((p) => (p === "filters" ? null : "filters"))}
          className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium shadow-xl"
        >
          <SlidersHorizontal className="h-4 w-4 text-[var(--health-green-500)]" />
          Filters
        </button>
        <button
          onClick={() => setMobilePanel((p) => (p === "layers" ? null : "layers"))}
          className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium shadow-xl"
        >
          <Layers className="h-4 w-4 text-[var(--health-green-500)]" />
          Layers
        </button>
      </div>

      <AnimatePresence>
        {mobilePanel && (
          <motion.div
            key={mobilePanel}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 left-1/2 z-[9999] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl lg:hidden"
            style={{ maxHeight: "60vh" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                {mobilePanel === "filters" ? "Filters" : "Layers & Legend"}
              </span>
              <button
                onClick={() => setMobilePanel(null)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--foreground-muted)] hover:bg-[var(--background-subtle)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {mobilePanel === "filters"
              ? <FilterPanel filters={filters} onChange={handleFilterChange} loading={isPending} />
              : <LegendPanel layers={layers} onLayerToggle={toggleLayer} threshold={threshold} onThresholdChange={handleThresholdChange} />
            }
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );

  return (
    <div className="-m-4 lg:-m-6 flex overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-80 xl:w-96 flex-shrink-0 flex-col gap-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">Heatmap</span>
          <ExportButton mapContainerId={MAP_CONTAINER_ID} divisions={divisions} />
        </div>
        <FilterPanel filters={filters} onChange={handleFilterChange} loading={isPending} />
        <LegendPanel layers={layers} onLayerToggle={toggleLayer} threshold={threshold} onThresholdChange={handleThresholdChange} />
      </aside>

      {/* ── Map pane ── */}
      <div className="relative flex-1 overflow-hidden">
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

        {/* Desktop breadcrumb overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden p-3 lg:flex">
          <div className="pointer-events-auto">
            <DrillDownBreadcrumb breadcrumbs={breadcrumbs} onNavigate={handleBreadcrumbNav} />
          </div>
        </div>

        {mobileFabs}

        {/* Loading overlay */}
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
