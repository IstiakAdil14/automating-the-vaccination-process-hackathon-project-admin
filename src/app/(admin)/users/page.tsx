"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { Users, GitMerge, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { CitizenSearchBar, type SearchFilters } from "@/components/admin/users/CitizenSearchBar";
import { CitizenResultsTable } from "@/components/admin/users/CitizenResultsTable";
import { CitizenProfileDrawer } from "@/components/admin/users/CitizenProfileDrawer";
import { AccountSuspendDialog } from "@/components/admin/users/AccountSuspendDialog";
import { IdentityVerificationPanel } from "@/components/admin/users/IdentityVerificationPanel";
import { DuplicateResolutionTool } from "@/components/admin/users/DuplicateResolutionTool";
import { AddNidUserDialog } from "@/components/admin/users/AddNidUserDialog";
import { searchCitizens, type CitizenRow } from "@/app/actions/users";

const EMPTY_FILTERS: SearchFilters = { query: "", division: "", vaccinationStatus: "", dateFrom: "", dateTo: "" };

export default function UsersPage() {
  const [data,        setData]        = useState<CitizenRow[]>([]);
  const [pagination,  setPagination]  = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading,     setLoading]     = useState(false);
  const [filters,     setFilters]     = useState<SearchFilters>(EMPTY_FILTERS);

  // Drawer / dialog state
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [suspendRow,   setSuspendRow]   = useState<CitizenRow | null>(null);
  const [verifyRow,    setVerifyRow]    = useState<CitizenRow | null>(null);
  const [mergeOpen,    setMergeOpen]    = useState(false);
  const [mergeA,       setMergeA]       = useState<CitizenRow | null>(null);
  const [mergeB,       setMergeB]       = useState<CitizenRow | null>(null);
  const [addOpen,      setAddOpen]      = useState(false);

  const [, startTransition] = useTransition();

  const fetchPage = useCallback((f: SearchFilters, page: number, limit = 20) => {
    setLoading(true);
    startTransition(async () => {
      const res = await searchCitizens({
        query:             f.query,
        division:          f.division,
        vaccinationStatus: f.vaccinationStatus,
        dateFrom:          f.dateFrom,
        dateTo:            f.dateTo,
        page,
        limit,
      });
      if (res.ok) {
        setData(res.data.data);
        setPagination({ page, pages: res.data.pages, total: res.data.total, limit });
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchPage(EMPTY_FILTERS, 1); }, [fetchPage]);

  function handleFiltersChange(f: SearchFilters) {
    setFilters(f);
    fetchPage(f, 1);
  }

  function handlePageChange(page: number) {
    fetchPage(filters, page, pagination.limit);
  }

  function handleLimitChange(limit: number) {
    fetchPage(filters, 1, limit);
  }

  function refresh() {
    fetchPage(filters, pagination.page, pagination.limit);
  }

  // Duplicate resolution: pick first two selected rows
  function openMerge() {
    if (data.length >= 2) { setMergeA(data[0]); setMergeB(data[1]); setMergeOpen(true); }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Citizen Management"
          description="Search, verify, and manage registered citizens"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="text-xs">
                <UserPlus className="h-4 w-4" /> Add NID User
              </Button>
              <Button size="sm" variant="outline" onClick={openMerge} className="text-xs">
                <GitMerge className="h-4 w-4" /> Duplicate Resolution
              </Button>
            </div>
          }
        />

        <CitizenSearchBar
          total={pagination.total}
          loading={loading}
          onChange={handleFiltersChange}
        />

        {data.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border)] py-20 text-center">
            <Users className="h-10 w-10 text-[var(--foreground-muted)]" />
            <p className="text-sm text-[var(--foreground-muted)]">No citizens found</p>
          </div>
        ) : (
          <CitizenResultsTable
            data={data}
            loading={loading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onView={(row) => setSelectedId(row._id)}
            onVerify={(row) => setVerifyRow(row)}
            onSuspend={(row) => setSuspendRow(row)}
            onRefresh={refresh}
          />
        )}
      </div>

      {/* Add NID User dialog */}
      <AddNidUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => { setAddOpen(false); fetchPage(filters, 1); }}
      />

      {/* Profile drawer */}
      <CitizenProfileDrawer
        citizenId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdate={refresh}
      />

      {/* Suspend dialog (from table quick-action) */}
      {suspendRow && (
        <AccountSuspendDialog
          citizenId={suspendRow._id}
          citizenName={suspendRow.name}
          open={!!suspendRow}
          onClose={() => setSuspendRow(null)}
          onSuspended={() => { setSuspendRow(null); refresh(); }}
        />
      )}

      {/* Verify dialog (from table quick-action) */}
      {verifyRow && (
        <Dialog open={!!verifyRow} onOpenChange={(o) => !o && setVerifyRow(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Verify Identity - {verifyRow.name}</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              <IdentityVerificationPanel
                citizenId={verifyRow._id}
                isVerified={verifyRow.isVerified}
                onUpdated={() => { setVerifyRow(null); refresh(); }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Duplicate resolution dialog */}
      {mergeOpen && mergeA && mergeB && (
        <Dialog open={mergeOpen} onOpenChange={(o) => !o && setMergeOpen(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitMerge className="h-5 w-5" /> Duplicate Resolution Tool
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              <DuplicateResolutionTool
                primary={mergeA}
                secondary={mergeB}
                onResolved={() => { setMergeOpen(false); refresh(); }}
                onClose={() => setMergeOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
