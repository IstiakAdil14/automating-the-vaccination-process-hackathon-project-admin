"use client";

import { useState, useTransition, useEffect } from "react";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPlatformPolicies, updatePlatformPolicy } from "@/app/actions/settings";
import { DEFAULT_PLATFORM_CONFIG } from "@/lib/platformDefaults";

/* --- Policy field config ------------------------------------------------------ */
const POLICY_FIELDS: {
  key: string;
  label: string;
  description: string;
  min: number;
  max: number;
  unit: string;
}[] = [
  {
    key: "otp_expiry_minutes",
    label: "OTP Expiry Duration",
    description: "How long an OTP remains valid after generation",
    min: 1, max: 60, unit: "minutes",
  },
  {
    key: "appointment_cancel_hours",
    label: "Appointment Cancellation Window",
    description: "Minimum hours before appointment that cancellation is allowed",
    min: 1, max: 168, unit: "hours",
  },
  {
    key: "walkin_quota_percent",
    label: "Walk-in Quota (Global Default)",
    description: "Default percentage of daily slots reserved for walk-ins",
    min: 0, max: 100, unit: "%",
  },
  {
    key: "session_timeout_minutes",
    label: "Session Timeout",
    description: "Admin session expires after this period of inactivity",
    min: 5, max: 480, unit: "minutes",
  },
  {
    key: "max_login_attempts",
    label: "Max Login Attempts Before Lockout",
    description: "Number of failed logins before account is locked",
    min: 1, max: 20, unit: "attempts",
  },
  {
    key: "lockout_duration_minutes",
    label: "Lockout Duration",
    description: "How long an account stays locked after too many failed attempts",
    min: 1, max: 1440, unit: "minutes",
  },
  {
    key: "failed_otp_attempts_block",
    label: "Failed OTP Attempts Before Block",
    description: "Number of wrong OTP entries before the OTP is invalidated",
    min: 1, max: 10, unit: "attempts",
  },
];

/* --- Single policy row -------------------------------------------------------- */
function PolicyRow({
  field,
  currentValue,
  onSave,
}: {
  field: (typeof POLICY_FIELDS)[number];
  currentValue: number;
  onSave: (key: string, value: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(currentValue));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const numVal = Number(draft);
  const isValid = !isNaN(numVal) && numVal >= field.min && numVal <= field.max;
  const isDirty = numVal !== currentValue;

  function handleSave() {
    if (!isValid) return;
    setError("");
    startTransition(async () => {
      await onSave(field.key, numVal);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{field.label}</p>
        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{field.description}</p>
        <p className="mt-1 text-[10px] text-[var(--foreground-subtle)]">
          Range: {field.min}-{field.max} {field.unit} - Default: {DEFAULT_PLATFORM_CONFIG[field.key] as number} {field.unit}
        </p>
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative">
          <Input
            type="number"
            min={field.min}
            max={field.max}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="h-8 w-24 pr-8 text-xs text-right"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--foreground-muted)] pointer-events-none">
            {field.unit.slice(0, 3)}
          </span>
        </div>

        <Button
          size="sm"
          variant={saved ? "outline" : "default"}
          onClick={handleSave}
          disabled={!isDirty || !isValid || isPending}
          className="h-8 w-8 p-0"
          title="Save"
        >
          {isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : saved
            ? <span className="text-[var(--success)] text-xs">-</span>
            : <Save className="h-3.5 w-3.5" />
          }
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDraft(String(currentValue))}
          disabled={!isDirty || isPending}
          className="h-8 w-8 p-0"
          title="Reset"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* --- Main --------------------------------------------------------------------- */
export function PlatformPolicies() {
  const [policies, setPolicies] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformPolicies().then((res) => {
      if (res.ok) setPolicies(res.data as Record<string, unknown>);
      setLoading(false);
    });
  }, []);

  async function handleSave(key: string, value: number) {
    await updatePlatformPolicy(key, value);
    setPolicies((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Platform Policies</h2>
        <p className="text-xs text-[var(--foreground-muted)]">
          Each field saves independently - changes take effect immediately
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--foreground-muted)]" />
        </div>
      ) : (
        <div className="space-y-3">
          {POLICY_FIELDS.map((field) => (
            <PolicyRow
              key={field.key}
              field={field}
              currentValue={Number(policies[field.key] ?? DEFAULT_PLATFORM_CONFIG[field.key])}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
