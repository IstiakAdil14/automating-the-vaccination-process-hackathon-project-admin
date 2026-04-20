"use client";

import { Rectangle, Tooltip } from "react-leaflet";
import type { UnderservedArea } from "@/types/heatmap";

export function UnderservedOverlay({ areas }: { areas: UnderservedArea[] }) {
  return (
    <>
      {areas.map((area) => (
        <Rectangle
          key={area.id}
          bounds={[
            [area.bounds.south, area.bounds.west],
            [area.bounds.north, area.bounds.east],
          ]}
          pathOptions={{ color: "#EF4444", fillColor: "#EF4444", fillOpacity: 0.18, weight: 1.5, opacity: 0.6 }}
        >
          <Tooltip sticky>
            <div style={{ fontFamily: "system-ui, sans-serif", minWidth: 160 }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{area.name}</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: "#64748B" }}>Coverage</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#EF4444" }}>{area.coverage}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#64748B" }}>Population</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#0F172A" }}>{new Intl.NumberFormat("en-US").format(area.population)}</span>
              </div>
              <div style={{ padding: "2px 8px", borderRadius: 9999, background: "#FEE2E2", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#991B1B" }}>
                UNDERSERVED AREA
              </div>
            </div>
          </Tooltip>
        </Rectangle>
      ))}
    </>
  );
}
