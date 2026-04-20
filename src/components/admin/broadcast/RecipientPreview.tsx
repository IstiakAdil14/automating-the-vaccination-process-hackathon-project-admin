"use client";

import { MessageSquare, Mail, Bell, Clock } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { BroadcastAudience } from "@/app/actions/broadcast";

const DIVISIONS = ["Dhaka","Chittagong","Sylhet","Rajshahi","Khulna","Barisal","Rangpur","Mymensingh"];

// Rough population weights for estimate distribution
const DIV_WEIGHTS: Record<string, number> = {
  Dhaka: 0.28, Chittagong: 0.20, Sylhet: 0.08, Rajshahi: 0.12,
  Khulna: 0.10, Barisal: 0.06, Rangpur: 0.10, Mymensingh: 0.06,
};

interface Props {
  audience:    BroadcastAudience;
  channels:    string[];
  totalCount:  number;
}

export function RecipientPreview({ audience, channels, totalCount }: Props) {
  const targetDivisions = audience.divisions.length > 0 ? audience.divisions : DIVISIONS;

  // Distribute total across divisions by weight
  const totalWeight = targetDivisions.reduce((s, d) => s + (DIV_WEIGHTS[d] ?? 0.1), 0);
  const divRows = targetDivisions.map((div) => ({
    division: div,
    count:    Math.round(totalCount * ((DIV_WEIGHTS[div] ?? 0.1) / totalWeight)),
  }));

  // Channel breakdown (rough split)
  const smsCount   = channels.includes("SMS")    ? Math.round(totalCount * 0.85) : 0;
  const emailCount = channels.includes("EMAIL")  ? Math.round(totalCount * 0.60) : 0;
  const inAppCount = channels.includes("IN_APP") ? totalCount                    : 0;

  const channelRows = [
    { icon: MessageSquare, label: "SMS",    count: smsCount,   delivery: "~2-5 minutes",  color: "var(--accent)" },
    { icon: Mail,          label: "Email",  count: emailCount, delivery: "~5-15 minutes", color: "var(--info)" },
    { icon: Bell,          label: "In-App", count: inAppCount, delivery: "Instant",        color: "var(--warning)" },
  ].filter((r) => r.count > 0);

  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm font-semibold text-[var(--foreground)]">Recipient Preview</p>

      {/* Channel breakdown */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">By Channel</p>
        {channelRows.map(({ icon: Icon, label, count, delivery, color }) => (
          <div key={label} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" style={{ color }} />
              <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums text-[var(--foreground)]">{formatNumber(count)}</p>
              <p className="flex items-center gap-1 text-[10px] text-[var(--foreground-muted)]">
                <Clock className="h-2.5 w-2.5" />{delivery}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Division breakdown */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">By Division</p>
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--foreground-muted)]">Division</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--foreground-muted)]">Recipients</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--foreground-muted)]">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {divRows.map(({ division, count }) => (
                <tr key={division} className="hover:bg-[var(--background-subtle)]">
                  <td className="px-4 py-2.5 text-sm text-[var(--foreground)]">{division}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums">{formatNumber(count)}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-[var(--foreground-muted)]">
                    {totalCount > 0 ? Math.round((count / totalCount) * 100) : 0}%
                  </td>
                </tr>
              ))}
              <tr className="border-t border-[var(--border)] bg-[var(--background-subtle)] font-semibold">
                <td className="px-4 py-2.5 text-sm">Total</td>
                <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums">{formatNumber(totalCount)}</td>
                <td className="px-4 py-2.5 text-right text-xs">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
