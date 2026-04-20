"use client";

import { useState, useEffect, useTransition } from "react";
import { Users, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatNumber } from "@/lib/utils";
import { estimateRecipients, type BroadcastAudience } from "@/app/actions/broadcast";

const DIVISIONS = ["Dhaka","Chittagong","Sylhet","Rajshahi","Khulna","Barisal","Rangpur","Mymensingh"];

const DISTRICT_MAP: Record<string, string[]> = {
  Dhaka:       ["Dhaka","Gazipur","Narayanganj","Manikganj","Munshiganj","Narsingdi","Faridpur"],
  Chittagong:  ["Chittagong","Cox's Bazar","Comilla","Feni","Noakhali","Lakshmipur","Chandpur"],
  Sylhet:      ["Sylhet","Moulvibazar","Habiganj","Sunamganj"],
  Rajshahi:    ["Rajshahi","Natore","Naogaon","Chapainawabganj","Pabna","Sirajganj","Bogra","Joypurhat"],
  Khulna:      ["Khulna","Jessore","Satkhira","Bagerhat","Narail","Magura","Jhenaidah","Kushtia","Chuadanga","Meherpur"],
  Barisal:     ["Barisal","Patuakhali","Bhola","Pirojpur","Jhalokati","Barguna"],
  Rangpur:     ["Rangpur","Dinajpur","Thakurgaon","Panchagarh","Nilphamari","Lalmonirhat","Kurigram","Gaibandha"],
  Mymensingh:  ["Mymensingh","Jamalpur","Sherpur","Netrokona"],
};

interface Props {
  audience:    BroadcastAudience;
  onChange:    (a: BroadcastAudience) => void;
  onTestSend?: () => void;
}

import type { ReactNode } from "react";

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">{children}</p>;
}

function CheckPill({ label, checked, onChange }: { label: string; checked: boolean; onChange: (_v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-all",
        checked
          ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--accent)]"
      )}
    >
      {label}
    </button>
  );
}

export function AudienceBuilder({ audience, onChange, onTestSend }: Props) {
  const [countData,  setCountData]  = useState({ citizens: 0, staff: 0, total: 0 });
  const [isPending,  startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await estimateRecipients(audience);
      if (res.ok) setCountData(res.data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(audience)]);

  function toggleRole(role: string) {
    const roles = audience.roles.includes(role)
      ? audience.roles.filter((r) => r !== role)
      : [...audience.roles, role];
    onChange({ ...audience, roles });
  }

  function toggleDivision(div: string) {
    const divisions = audience.divisions.includes(div)
      ? audience.divisions.filter((d) => d !== div)
      : [...audience.divisions, div];
    onChange({ ...audience, divisions, districts: [] });
  }

  function toggleDistrict(dist: string) {
    const districts = audience.districts.includes(dist)
      ? audience.districts.filter((d) => d !== dist)
      : [...audience.districts, dist];
    onChange({ ...audience, districts });
  }

  const availableDistricts = audience.divisions.flatMap((div) => DISTRICT_MAP[div] ?? []);

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm font-semibold text-[var(--foreground)]">Audience Builder</p>

      {/* Section 1 - By Role */}
      <div>
        <SectionLabel>By Role</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {["CITIZEN","STAFF","ADMIN"].map((role) => (
            <CheckPill
              key={role}
              label={role.charAt(0) + role.slice(1).toLowerCase()}
              checked={audience.roles.includes(role)}
              onChange={() => toggleRole(role)}
            />
          ))}
        </div>
        {audience.roles.length === 0 && (
          <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">No role selected = all users</p>
        )}
      </div>

      {/* Section 2 - By Geography */}
      <div>
        <SectionLabel>By Division</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {DIVISIONS.map((div) => (
            <CheckPill
              key={div}
              label={div}
              checked={audience.divisions.includes(div)}
              onChange={() => toggleDivision(div)}
            />
          ))}
        </div>
        {availableDistricts.length > 0 && (
          <div className="mt-3">
            <SectionLabel>By District</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {availableDistricts.map((dist) => (
                <CheckPill
                  key={dist}
                  label={dist}
                  checked={audience.districts.includes(dist)}
                  onChange={() => toggleDistrict(dist)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 3 - By Vaccination Status */}
      <div>
        <SectionLabel>By Vaccination Status</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "",             label: "All" },
            { value: "UNVACCINATED", label: "Unvaccinated" },
            { value: "PARTIAL",      label: "Partial" },
            { value: "COMPLETE",     label: "Complete" },
          ].map(({ value, label }) => (
            <CheckPill
              key={label}
              label={label}
              checked={(audience.vaccinationStatus ?? "") === value}
              onChange={() => onChange({ ...audience, vaccinationStatus: value || undefined })}
            />
          ))}
        </div>
      </div>

      {/* Section 4 - By Demographics */}
      <div>
        <SectionLabel>By Demographics</SectionLabel>
        <div className="flex flex-wrap gap-3">
          <Select
            value={audience.gender ?? "all"}
            onValueChange={(v) => onChange({ ...audience, gender: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min age"
              value={audience.ageMin ?? ""}
              min={0} max={120}
              onChange={(e) => onChange({ ...audience, ageMin: e.target.value ? Number(e.target.value) : undefined })}
              className="h-8 w-20 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
            <span className="text-xs text-[var(--foreground-muted)]">-</span>
            <input
              type="number"
              placeholder="Max age"
              value={audience.ageMax ?? ""}
              min={0} max={120}
              onChange={(e) => onChange({ ...audience, ageMax: e.target.value ? Number(e.target.value) : undefined })}
              className="h-8 w-20 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Live counter */}
      <div className={cn(
        "flex items-center justify-between rounded-xl border p-4",
        countData.total > 0 ? "border-[var(--accent)] bg-[var(--accent-subtle)]" : "border-[var(--border)] bg-[var(--background-subtle)]"
      )}>
        <div className="flex items-center gap-2">
          {isPending
            ? <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
            : <Users className="h-4 w-4 text-[var(--accent)]" />}
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Estimated Recipients: {isPending ? "-" : formatNumber(countData.total)}
            </p>
            {!isPending && countData.total > 0 && (
              <p className="text-xs text-[var(--foreground-muted)]">
                {formatNumber(countData.citizens)} citizens - {formatNumber(countData.staff)} staff
              </p>
            )}
          </div>
        </div>
        {onTestSend && (
          <Button size="sm" variant="outline" onClick={onTestSend} className="text-xs">
            <Send className="h-3.5 w-3.5" /> Test Send
          </Button>
        )}
      </div>
    </div>
  );
}
