"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { VaccineMasterList } from "./VaccineMasterList";
import { RBACEditor } from "./RBACEditor";
import { APIKeyManager } from "./APIKeyManager";
import { PlatformPolicies } from "./PlatformPolicies";
import { LocalizationManager } from "./LocalizationManager";
import { SettingsAuditTrail } from "./SettingsAuditTrail";
import { cn } from "@/lib/utils";
import {
  Syringe, ShieldCheck, KeyRound, SlidersHorizontal,
  Languages, ClipboardList,
} from "lucide-react";

const TABS = [
  { id: "vaccines",     label: "Vaccine Master",      icon: Syringe },
  { id: "rbac",         label: "Roles & Permissions",  icon: ShieldCheck },
  { id: "api-keys",     label: "API Keys",             icon: KeyRound },
  { id: "policies",     label: "Platform Policies",    icon: SlidersHorizontal },
  { id: "localization", label: "Localization",          icon: Languages },
  { id: "audit",        label: "Settings Audit",        icon: ClipboardList },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsShell() {
  const [active, setActive] = useState<TabId>("vaccines");

  return (
    <>
      <PageHeader
        title="System Settings"
        description="Super Admin only - all changes are logged and audited"
      />

      <div className="mt-6 flex gap-6">
        {/* Left nav */}
        <nav className="w-52 flex-shrink-0 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-left",
                active === id
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--foreground-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Right content */}
        <div className="min-w-0 flex-1">
          {active === "vaccines"     && <VaccineMasterList />}
          {active === "rbac"         && <RBACEditor />}
          {active === "api-keys"     && <APIKeyManager />}
          {active === "policies"     && <PlatformPolicies />}
          {active === "localization" && <LocalizationManager />}
          {active === "audit"        && <SettingsAuditTrail />}
        </div>
      </div>
    </>
  );
}
