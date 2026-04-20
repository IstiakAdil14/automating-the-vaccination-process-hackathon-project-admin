"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Clock, Ban, Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { StaffDataTable } from "@/components/admin/staff/StaffDataTable";
import { StaffDetailSheet } from "@/components/admin/staff/StaffDetailSheet";
import { CreateStaffDialog } from "@/components/admin/staff/CreateStaffDialog";
import { BulkImportDialog } from "@/components/admin/staff/BulkImportDialog";
import { StaffRequestsPanel } from "@/components/admin/staff/StaffRequestsPanel";
import { cn } from "@/lib/utils";

type Tab = "all" | "requests" | "suspended";

const TABS: { id: Tab; label: string; icon: React.ReactNode; status?: "active" | "suspended" | "inactive" }[] = [
  { id: "all",       label: "All Staff",        icon: <Users className="h-4 w-4" /> },
  { id: "requests",  label: "Pending Requests", icon: <Clock className="h-4 w-4" /> },
  { id: "suspended", label: "Suspended",        icon: <Ban   className="h-4 w-4" />, status: "suspended" },
];

export default function StaffPage() {
  const [activeTab,    setActiveTab]    = useState<Tab>("all");
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [importOpen,   setImportOpen]   = useState(false);
  const [tableKey,     setTableKey]     = useState(0);

  function handleUpdate() { setTableKey((k) => k + 1); }

  const currentTab = TABS.find((t) => t.id === activeTab);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff Management"
        description="Manage vaccination center staff nationwide"
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Bulk Import
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add Staff
            </Button>
          </div>
        }
      />

      {/* Tab bar */}
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

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "requests" ? (
          <StaffRequestsPanel />
        ) : (
          <StaffDataTable
            key={tableKey}
            statusFilter={currentTab?.status}
            onRowClick={(staff) => setSelectedId(staff._id)}
          />
        )}
      </motion.div>

      {/* Detail sheet */}
      <StaffDetailSheet
        staffId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdate={handleUpdate}
      />

      {/* Create dialog */}
      <CreateStaffDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); handleUpdate(); }}
      />

      {/* Bulk import dialog */}
      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); handleUpdate(); }}
      />
    </div>
  );
}
