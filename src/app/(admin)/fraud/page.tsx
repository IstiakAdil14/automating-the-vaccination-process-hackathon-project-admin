"use client";

import { ShieldAlert, Search, FileText, QrCode } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { FraudDashboardKPIs }     from "@/components/admin/fraud/FraudDashboardKPIs";
import { FraudAlertsList }        from "@/components/admin/fraud/FraudAlertsList";
import { NationalAuditLog }       from "@/components/admin/fraud/NationalAuditLog";
import { QRTamperReports }        from "@/components/admin/fraud/QRTamperReports";
import { LiveAlertBanner }        from "@/components/admin/fraud/LiveAlertBanner";

export default function FraudPage() {
  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Fraud Detection & Audit"
          description="Nationwide fraud alerts, case investigation, audit trail, and QR tamper reports"
        />

        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="mb-2 h-auto flex-wrap gap-1 bg-transparent p-0">
            {[
              { value: "alerts",    label: "Fraud Alerts",       icon: ShieldAlert },
              { value: "audit",     label: "Audit Log",          icon: FileText },
              { value: "qr",        label: "QR Tamper Reports",  icon: QrCode },
              { value: "search",    label: "Case Investigation",  icon: Search },
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

          {/* -- Fraud Alerts -- */}
          <TabsContent value="alerts" className="mt-4 space-y-8">
            <FraudDashboardKPIs />
            <div className="border-t border-[var(--border)] pt-6">
              <p className="mb-4 text-sm font-semibold text-[var(--foreground)]">All Fraud Alerts</p>
              <FraudAlertsList />
            </div>
          </TabsContent>

          {/* -- Audit Log -- */}
          <TabsContent value="audit" className="mt-4">
            <NationalAuditLog />
          </TabsContent>

          {/* -- QR Tamper Reports -- */}
          <TabsContent value="qr" className="mt-4">
            <QRTamperReports />
          </TabsContent>

          {/* -- Case Investigation (standalone alert list filtered to open) -- */}
          <TabsContent value="search" className="mt-4">
            <FraudAlertsList />
          </TabsContent>
        </Tabs>
      </div>

      {/* SSE live alert toasts - fixed bottom-right */}
      <LiveAlertBanner />
    </>
  );
}
