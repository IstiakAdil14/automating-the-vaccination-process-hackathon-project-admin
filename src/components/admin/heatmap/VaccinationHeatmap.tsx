"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CenterPinMarker } from "./CenterPin";
import { UnderservedOverlay } from "./UnderservedOverlay";
import {
  BD_CENTER, MAP_DEFAULT_ZOOM,
  type LayerState, type BreadcrumbLevel,
} from "@/types/heatmap";
import type { CenterMapPin, HeatmapPoint, UnderservedArea } from "@/types/heatmap";

/* --- Heatmap layer ------------------------------------------------------------ */
function HeatLayer({ points, visible }: { points: HeatmapPoint[]; visible: boolean }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!visible || points.length === 0) {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
      return;
    }

    import("leaflet.heat").then((mod) => {
      const heatFn = (mod as unknown as { default: typeof import("leaflet.heat") }).default ?? mod;
      if (layerRef.current) map.removeLayer(layerRef.current);
      const data: [number, number, number][] = points.map((p) => [p.lat, p.lng, p.weight]);
      layerRef.current = heatFn(data, {
        radius: 35, blur: 25, maxZoom: 13, max: 1,
        gradient: { 0.0: "#EF4444", 0.4: "#F59E0B", 0.7: "#10B981", 1.0: "#10B981" },
      }).addTo(map);
    });

    return () => { if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, visible]);

  return null;
}

/* --- Breadcrumb / drill-down sync -------------------------------------------- */
function MapController({ breadcrumbs }: { breadcrumbs: BreadcrumbLevel[] }) {
  const map = useMap();
  const crumb = breadcrumbs.at(-1);
  useEffect(() => {
    if (!crumb) return;
    if (crumb.center) map.setView([crumb.center.lat, crumb.center.lng], crumb.zoom, { animate: true });
  }, [crumb, map]);
  return null;
}

/* --- Click handler ------------------------------------------------------------ */
function ClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onClick) return;
    const handler = (e: L.LeafletMouseEvent) => onClick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [map, onClick]);
  return null;
}

/* --- Main component ----------------------------------------------------------- */
interface VaccinationHeatmapProps {
  containerId:   string;
  heatmapPoints: HeatmapPoint[];
  centerPins:    CenterMapPin[];
  underserved:   UnderservedArea[];
  layers:        LayerState;
  breadcrumbs:   BreadcrumbLevel[];
  onMapClick?:   (lat: number, lng: number) => void;
}

export function VaccinationHeatmap({
  containerId, heatmapPoints, centerPins, underserved,
  layers, breadcrumbs, onMapClick,
}: VaccinationHeatmapProps) {
  return (
    <div id={containerId} className="h-full w-full">
      <MapContainer
        center={[BD_CENTER.lat, BD_CENTER.lng]}
        zoom={MAP_DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapController breadcrumbs={breadcrumbs} />
        <ClickHandler onClick={onMapClick} />

        <HeatLayer points={heatmapPoints} visible={layers.heatmap} />

        {layers.centerPins && centerPins.map((c) => (
          <CenterPinMarker key={c.centerId} center={c} />
        ))}

        {layers.underserved && <UnderservedOverlay areas={underserved} />}
      </MapContainer>
    </div>
  );
}
