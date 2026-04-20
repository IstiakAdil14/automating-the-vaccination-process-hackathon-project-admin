"use client";

import { Zap, Settings2, Clock, Globe, History } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader }          from "@/components/shared/PageHeader";
import { QuickReports }        from "@/components/admin/reports/QuickReports";
import { CustomReportBuilder } from "@/components/admin/reports/CustomReportBuilder";
import { ScheduledReports }    from "@/components/admin/reports/ScheduledReports";
import { PublicDataExport }    from "@/components/admin/reports/PublicDataExport";
import { ReportPreview }       from "@/components/admin/reports/ReportPreview";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports & Analytics"
        description="Generate, schedule, and export nationwide vaccination reports"
      />

      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="mb-2 h-auto flex-wrap gap-1 bg-transparent p-0">
          {[
            { value: "quick",    label: "Quick Reports",        icon: Zap },
            { value: "custom",   label: "Custom Report Builder", icon: Settings2 },
            { value: "scheduled",label: "Scheduled Reports",    icon: Clock },
            { value: "public",   label: "Public Data Export",   icon: Globe },
            { value: "history",  label: "Report History",       icon: History },
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

        <TabsContent value="quick"     className="mt-4"><QuickReports /></TabsContent>
        <TabsContent value="custom"    className="mt-4"><CustomReportBuilder /></TabsContent>
        <TabsContent value="scheduled" className="mt-4"><ScheduledReports /></TabsContent>
        <TabsContent value="public"    className="mt-4"><PublicDataExport /></TabsContent>
        <TabsContent value="history"   className="mt-4"><ReportPreview /></TabsContent>
      </Tabs>
    </div>
  );
}
