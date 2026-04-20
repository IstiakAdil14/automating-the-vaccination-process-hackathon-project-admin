"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Clock, Ban, BarChart2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { CentersDataTable } from "@/components/admin/centers/CentersDataTable";
import { CenterDetailSheet } from "@/components/admin/centers/CenterDetailSheet";
import { ApplicationReviewDialog } from "@/components/admin/centers/ApplicationReviewDialog";
import { PerformanceCompare } from "@/components/admin/centers/PerformanceCompare";
import { cn } from "@/lib/utils";
import type { Center, CenterStatus } from "@/types";

type Tab = "all" | "pending" | "suspended" | "compare";

const TABS: { id: Tab; label: string; icon: React.ReactNode; status?: CenterStatus }[] = [
  { id: "all",       label: "All Centers",         icon: <Building2 className="h-4 w-4" /> },
  { id: "pending",   label: "Pending Applications", icon: <Clock     className="h-4 w-4" />, status: "PENDING" },
  { id: "suspended", label: "Suspended",            icon: <Ban       className="h-4 w-4" />, status: "SUSPENDED" },
  { id: "compare",   label: "Compare",              icon: <BarChart2 className="h-4 w-4" /> },
];

export default function CentersPage() {
  const [activeTab,       setActiveTab]       = useState<Tab>("all");
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [reviewCenter,    setReviewCenter]    = useState<Center | null>(null);
  const [tableKey,        setTableKey]        = useState(0);   /* bump to force refetch */

  function handleRowClick(center: Center) {
    if (activeTab === "pending") {
      setReviewCenter(center);
    } else {
      setSelectedId(center._id);
    }
  }

  function handleUpdate() {
    setTableKey((k) => k + 1);
  }

  const currentTab = TABS.find((t) => t.id === activeTab);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vaccination Centers"
        description="Manage all registered vaccination centers nationwide"
      />

      {/* -- Tab bar -- */}
      <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--background-subtle)] p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* -- Content -- */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "compare" ? (
          <PerformanceCompare />
        ) : (
          <CentersDataTable
            key={tableKey}
            statusFilter={currentTab?.status}
            onRowClick={handleRowClick}
          />
        )}
      </motion.div>

      {/* -- Detail sheet (all / suspended tabs) -- */}
      <CenterDetailSheet
        centerId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdate={handleUpdate}
      />

      {/* -- Application review dialog (pending tab) -- */}
      {reviewCenter && (
        <ApplicationReviewDialog
          center={reviewCenter}
          open={!!reviewCenter}
          onClose={() => setReviewCenter(null)}
          onReviewed={() => {
            setReviewCenter(null);
            handleUpdate();
          }}
        />
      )}
    </div>
  );
}
