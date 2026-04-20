"use client";

import { Package, ClipboardList, Truck, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { NationalStockOverview }  from "@/components/admin/supply/NationalStockOverview";
import { PerCenterStockTable }    from "@/components/admin/supply/PerCenterStockTable";
import { RestockRequestQueue }    from "@/components/admin/supply/RestockRequestQueue";
import { DispatchLog }            from "@/components/admin/supply/DispatchLog";
import { ExpiryWastageTracker }   from "@/components/admin/supply/ExpiryWastageTracker";
import { AIForecastPanel }        from "@/components/admin/supply/AIForecastPanel";

export default function SupplyPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Supply Chain Monitor"
        description="Nationwide vaccine inventory, dispatch tracking, and AI-powered forecasting"
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-2 h-auto flex-wrap gap-1 bg-transparent p-0">
          {[
            { value: "overview",  label: "Overview",         icon: Package },
            { value: "restock",   label: "Restock Requests", icon: ClipboardList },
            { value: "dispatch",  label: "Dispatch Log",     icon: Truck },
            { value: "expiry",    label: "Expiry Tracker",   icon: AlertTriangle },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 rounded-lg border border-transparent px-4 py-2 text-sm font-medium transition-all data-[state=active]:border-[var(--border)] data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-sm"
            >
              <Icon className="h-4 w-4" />{label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* -- Overview -- */}
        <TabsContent value="overview" className="space-y-8 mt-4">
          <NationalStockOverview />
          <div className="border-t border-[var(--border)] pt-6">
            <p className="mb-4 text-sm font-semibold text-[var(--foreground)]">Per-Center Stock Breakdown</p>
            <PerCenterStockTable />
          </div>
          <div className="border-t border-[var(--border)] pt-6">
            <AIForecastPanel />
          </div>
        </TabsContent>

        {/* -- Restock Requests -- */}
        <TabsContent value="restock" className="mt-4">
          <RestockRequestQueue />
        </TabsContent>

        {/* -- Dispatch Log -- */}
        <TabsContent value="dispatch" className="mt-4">
          <DispatchLog />
        </TabsContent>

        {/* -- Expiry Tracker -- */}
        <TabsContent value="expiry" className="mt-4">
          <ExpiryWastageTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
}
