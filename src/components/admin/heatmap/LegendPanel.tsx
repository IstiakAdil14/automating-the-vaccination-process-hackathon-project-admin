"use client";

import { motion } from "framer-motion";
import { Layers, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { CENTER_PIN_COLORS, CENTER_PIN_LABELS, type LayerState } from "@/types/heatmap";

interface LegendPanelProps {
  layers:            LayerState;
  onLayerToggle:     (key: keyof LayerState) => void;
  threshold:         number;
  onThresholdChange: (v: number) => void;
}

export function LegendPanel({ layers, onLayerToggle, threshold, onThresholdChange }: LegendPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="pointer-events-auto w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-[var(--health-green-500)]" />
        <span className="text-xs font-semibold text-[var(--foreground)]">Map Layers & Legend</span>
      </div>

      {/* Coverage gradient */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
          Coverage Scale
        </p>
        <div className="h-3 w-full rounded-full" style={{
          background: "linear-gradient(to right, #EF4444, #F59E0B, #10B981)",
        }} />
        <div className="mt-1 flex justify-between text-[10px] text-[var(--foreground-muted)]">
          <span>0%</span>
          <span className="text-[var(--amber-500)]">40%</span>
          <span className="text-[var(--health-green-500)]">70%+</span>
        </div>
      </div>

      {/* Layer toggles */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
          Layers
        </p>
        <div className="space-y-1.5">
          {(Object.keys(layers) as (keyof LayerState)[]).map((key) => {
            const labels: Record<keyof LayerState, string> = {
              heatmap:     "Heatmap Density",
              centerPins:  "Center Pins",
              underserved: "Underserved Areas",
            };
            return (
              <button
                key={key}
                onClick={() => onLayerToggle(key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                  layers[key]
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                    : "text-[var(--foreground-muted)] hover:bg-[var(--background-subtle)]"
                )}
              >
                {layers[key]
                  ? <Eye    className="h-3.5 w-3.5 flex-shrink-0" />
                  : <EyeOff className="h-3.5 w-3.5 flex-shrink-0" />
                }
                {labels[key]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center pin legend */}
      {layers.centerPins && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
            Center Types
          </p>
          <div className="space-y-1.5">
            {Object.entries(CENTER_PIN_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="h-3 w-3 flex-shrink-0 rounded-full border-2 border-white shadow-sm" style={{ background: color }} />
                <span className="text-[11px] text-[var(--foreground-muted)]">
                  {CENTER_PIN_LABELS[type]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Underserved threshold */}
      {layers.underserved && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Underserved Threshold
            </p>
            <span className="text-xs font-bold text-[var(--danger)]">{threshold}%</span>
          </div>
          <input
            type="range"
            min={10} max={80} step={5}
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            className="w-full accent-[var(--health-green-500)]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[var(--foreground-muted)]">
            <span>10%</span>
            <span>80%</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
