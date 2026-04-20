"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { CENTER_PIN_COLORS, CENTER_PIN_LABELS } from "@/types/heatmap";
import type { CenterMapPin } from "@/types/heatmap";

function makeIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="8" fill="${color}" stroke="#fff" stroke-width="2"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

export function CenterPinMarker({ center }: { center: CenterMapPin }) {
  const color = CENTER_PIN_COLORS[center.type] ?? "#64748B";
  const slotsPercent = center.dailyCapacity > 0
    ? Math.round((center.vaccinationsToday / center.dailyCapacity) * 100)
    : 0;
  const isFull = center.slotsRemaining === 0;

  return (
    <Marker position={[center.lat, center.lng]} icon={makeIcon(color)} title={center.name}>
      <Popup minWidth={220} maxWidth={260}>
        <div style={{ fontFamily: "system-ui, sans-serif", padding: 0 }}>
          {/* Header */}
          <div style={{ background: color, padding: "10px 12px", borderRadius: "8px 8px 0 0", margin: "-8px -12px 8px" }}>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {CENTER_PIN_LABELS[center.type]}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: "#fff", fontWeight: 700, lineHeight: 1.3 }}>
              {center.name}
            </p>
          </div>

          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748B" }}>
            {center.address.upazila}, {center.address.district}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
            {[["CAPACITY", center.dailyCapacity, "#0F172A"], ["TODAY", center.vaccinationsToday, "#10B981"]].map(([label, val, clr]) => (
              <div key={label as string} style={{ background: "#F1F5F9", borderRadius: 6, padding: "6px 8px" }}>
                <p style={{ margin: 0, fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>{label}</p>
                <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: clr as string }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: "#64748B" }}>Daily utilisation</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: slotsPercent >= 90 ? "#EF4444" : "#10B981" }}>{slotsPercent}%</span>
            </div>
            <div style={{ height: 4, background: "#E2E8F0", borderRadius: 9999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${slotsPercent}%`, background: slotsPercent >= 90 ? "#EF4444" : "#10B981", borderRadius: 9999 }} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#64748B" }}>{isFull ? "No slots remaining" : `${center.slotsRemaining} slots left`}</span>
            <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 10, fontWeight: 700, background: center.status === "ACTIVE" ? "#D1FAE5" : "#FEE2E2", color: center.status === "ACTIVE" ? "#065F46" : "#991B1B" }}>
              {center.status}
            </span>
          </div>

          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #E2E8F0" }}>
            <p style={{ margin: 0, fontSize: 10, color: "#94A3B8" }}>{center.contact.name} · {center.contact.phone}</p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
