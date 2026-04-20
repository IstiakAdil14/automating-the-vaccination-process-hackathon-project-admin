"use client";

import { useState, useTransition, useEffect } from "react";
import { RefreshCw, Loader2, Eye, EyeOff, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SecondAdminConfirmDialog } from "./SecondAdminConfirmDialog";
import { getApiKeyInfo, rotateApiKey, type ApiKeyInfo } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

/* --- Mock daily usage data ---------------------------------------------------- */
const MOCK_USAGE: Record<string, number[]> = {
  OpenAI:      [120, 95, 210, 180, 300, 250, 190],
  "Google Maps": [45, 60, 55, 70, 80, 65, 72],
  Twilio:      [30, 28, 35, 40, 22, 38, 31],
  SendGrid:    [200, 180, 220, 195, 240, 210, 205],
};

const SERVICE_ICONS: Record<string, string> = {
  OpenAI:        "--",
  "Google Maps": "---",
  Twilio:        "--",
  SendGrid:      "--",
};

/* --- Mini bar chart ----------------------------------------------------------- */
function MiniBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className="w-full rounded-sm bg-[var(--accent)] opacity-70 transition-all"
            style={{ height: `${(v / max) * 32}px` }}
            title={`${days[i]}: ${v} requests`}
          />
          <span className="text-[9px] text-[var(--foreground-subtle)]">{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* --- API Key Card ------------------------------------------------------------- */
function ApiKeyCard({
  info,
  onRotate,
}: {
  info: ApiKeyInfo;
  onRotate: (service: string) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const usage = MOCK_USAGE[info.service] ?? [0, 0, 0, 0, 0, 0, 0];
  const totalWeek = usage.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{SERVICE_ICONS[info.service] ?? "--"}</span>
          <div>
            <p className="text-sm font-semibold">{info.service}</p>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              {info.requestsMonth.toLocaleString()} requests this month
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            info.maskedKey === "Not configured"
              ? "border-[var(--danger)] text-[var(--danger)]"
              : "border-[var(--success)] text-[var(--success)]"
          )}
        >
          {info.maskedKey === "Not configured" ? "Not configured" : "Active"}
        </Badge>
      </div>

      {/* Masked key */}
      <div className="flex items-center gap-2 rounded-lg bg-[var(--background-subtle)] px-3 py-2">
        <code className="flex-1 text-xs font-mono text-[var(--foreground-muted)]">
          {showKey ? info.maskedKey : info.maskedKey.replace(/[^-]/g, "*").slice(0, -4) + info.maskedKey.slice(-4)}
        </code>
        <button
          onClick={() => setShowKey((v) => !v)}
          className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Usage chart */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
            Last 7 days
          </span>
          <span className="text-[10px] text-[var(--foreground-muted)]">{totalWeek} total</span>
        </div>
        <MiniBarChart data={usage} />
      </div>

      {info.lastUsed && (
        <p className="text-[10px] text-[var(--foreground-muted)]">
          Last used: {new Date(info.lastUsed).toLocaleDateString()}
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5 text-xs border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-subtle)]"
        onClick={() => onRotate(info.service)}
      >
        <RefreshCw className="h-3.5 w-3.5" /> Rotate / Regenerate Key
      </Button>
    </div>
  );
}

/* --- Main --------------------------------------------------------------------- */
export function APIKeyManager() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetService, setTargetService] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState("");

  useEffect(() => {
    getApiKeyInfo().then((res) => {
      if (res.ok) setKeys(res.data as ApiKeyInfo[]);
      setLoading(false);
    });
  }, []);

  function onConfirmed(email: string, password: string) {
    if (!targetService) return;
    const service = targetService;
    setTargetService(null);
    startTransition(async () => {
      const res = await rotateApiKey(service, email, password);
      if (res.ok) {
        setToast(`${service} key rotated successfully`);
        setTimeout(() => setToast(""), 3000);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">API Key Manager</h2>
        <p className="text-xs text-[var(--foreground-muted)]">
          Key rotation requires second Super Admin confirmation
        </p>
      </div>

      {toast && (
        <div className="rounded-lg bg-[var(--success-subtle)] px-3 py-2 text-xs text-[var(--success)]">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--foreground-muted)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {keys.map((k) => (
            <ApiKeyCard key={k.service} info={k} onRotate={setTargetService} />
          ))}
        </div>
      )}

      <SecondAdminConfirmDialog
        open={!!targetService}
        title={`Rotate ${targetService} API Key`}
        description={`This will invalidate the current ${targetService} key immediately. All services using it will fail until the new key is configured.`}
        onConfirmed={onConfirmed}
        onCancel={() => setTargetService(null)}
      />
    </div>
  );
}
