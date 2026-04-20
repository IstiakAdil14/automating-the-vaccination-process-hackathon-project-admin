"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, Loader2, UserCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { StaffRole } from "@/types";

/* --- Types -------------------------------------------------------------------- */
interface PopulatedStaff {
  _id:               string;
  staffId:           string;
  name:              string;
  nid:               string;
  email:             string;
  role:              StaffRole;
  centerId:          { _id: string; name: string; address: { division: string; district: string } };
  isActive:          boolean;
  isSuspended:       boolean;
  totalVaccinations: number;
  shiftsWorked:      number;
  lastActive?:       string;
  createdAt:         string;
}

interface Pagination { page: number; limit: number; total: number; pages: number }

interface StaffDataTableProps {
  statusFilter?: "active" | "suspended" | "inactive";
  onRowClick:    (staff: PopulatedStaff) => void;
}

/* --- Constants ---------------------------------------------------------------- */
const ROLE_COLORS: Record<StaffRole, string> = {
  VACCINATOR:   "bg-[var(--accent-subtle)] text-[var(--accent)]",
  RECEPTIONIST: "bg-[var(--info-subtle)] text-[var(--info)]",
  SUPERVISOR:   "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
};

const DIVISIONS = ["Dhaka","Chittagong","Sylhet","Rajshahi","Khulna","Barisal","Rangpur","Mymensingh"];

/* --- Helpers ------------------------------------------------------------------ */
function maskNid(nid: string): string {
  if (nid.length <= 4) return "****";
  return "*".repeat(nid.length - 4) + nid.slice(-4);
}

function useDebounce<T>(value: T, delay = 300): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

/* --- Columns ------------------------------------------------------------------ */
function buildColumns(onRowClick: (s: PopulatedStaff) => void): ColumnDef<PopulatedStaff>[] {
  return [
    {
      id: "name",
      header: "Name",
      cell: ({ row: { original: s } }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--background-subtle)] text-sm font-bold text-[var(--foreground-muted)]">
            {s.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--foreground)]">{s.name}</p>
            <p className="truncate text-xs text-[var(--foreground-muted)]">{s.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "nid",
      header: "NID",
      cell: ({ row: { original: s } }) => (
        <span className="font-mono text-xs text-[var(--foreground-muted)]">{maskNid(s.nid)}</span>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row: { original: s } }) => (
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", ROLE_COLORS[s.role])}>
          {s.role}
        </span>
      ),
    },
    {
      id: "center",
      header: "Assigned Center",
      cell: ({ row: { original: s } }) => (
        <div>
          <p className="text-sm text-[var(--foreground)]">{s.centerId?.name ?? "-"}</p>
          <p className="text-xs text-[var(--foreground-muted)]">{s.centerId?.address?.division}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row: { original: s } }) => {
        const label = s.isSuspended ? "Suspended" : s.isActive ? "Active" : "Inactive";
        const cls   = s.isSuspended
          ? "bg-[var(--danger-subtle)] text-[var(--danger)]"
          : s.isActive
            ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
            : "bg-[var(--background-subtle)] text-[var(--foreground-muted)]";
        return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>{label}</span>;
      },
    },
    {
      id: "totalVaccinations",
      header: "Vaccinations",
      cell: ({ row: { original: s } }) => (
        <span className="font-mono text-sm tabular-nums">{formatNumber(s.totalVaccinations)}</span>
      ),
    },
    {
      id: "createdAt",
      header: "Joined",
      cell: ({ row: { original: s } }) => (
        <span className="text-xs text-[var(--foreground-muted)]">{formatDate(s.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onRowClick(row.original); }} className="text-xs">
          View
        </Button>
      ),
    },
  ];
}

function SortHeader({ label, colId, sorting, onSort }: {
  label: string; colId: string; sorting: SortingState; onSort: (id: string) => void;
}) {
  const active = sorting[0]?.id === colId;
  const desc   = sorting[0]?.desc;
  return (
    <button onClick={() => onSort(colId)} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
      {label}
      {active ? (desc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );
}

/* --- StaffDataTable ----------------------------------------------------------- */
export function StaffDataTable({ statusFilter, onRowClick }: StaffDataTableProps) {
  const [data,       setData]       = useState<PopulatedStaff[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search,     setSearch]     = useState("");
  const [role,       setRole]       = useState("all");
  const [division,   setDivision]   = useState("all");
  const [sorting,    setSorting]    = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [isPending,  startTransition] = useTransition();

  const debouncedSearch = useDebounce(search, 300);

  const fetchData = useCallback((page: number) => {
    startTransition(async () => {
      const params = new URLSearchParams({
        page:    String(page),
        limit:   "20",
        search:  debouncedSearch,
        sortBy:  sorting[0]?.id ?? "createdAt",
        sortDir: sorting[0]?.desc ? "desc" : "asc",
      });
      if (statusFilter)        params.set("status",   statusFilter);
      if (role !== "all")      params.set("role",     role);
      if (division !== "all")  params.set("division", division);

      const res  = await fetch(`/api/admin/staff?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination);
    });
  }, [debouncedSearch, sorting, statusFilter, role, division]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  function handleSort(colId: string) {
    setSorting((prev) =>
      prev[0]?.id === colId ? [{ id: colId, desc: !prev[0].desc }] : [{ id: colId, desc: true }]
    );
  }

  const columns = buildColumns(onRowClick);
  const table   = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), manualPagination: true, manualSorting: true, state: { sorting } });
  const SORTABLE = ["name", "totalVaccinations", "createdAt", "role"];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <Input placeholder="Search name, NID, email-" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {["VACCINATOR","RECEPTIONIST","SUPERVISOR"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={division} onValueChange={setDivision}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Division" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-[var(--foreground-muted)]">{formatNumber(pagination.total)} staff</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 text-left">
                      {SORTABLE.includes(header.id)
                        ? <SortHeader label={String(header.column.columnDef.header)} colId={header.id} sorting={sorting} onSort={handleSort} />
                        : <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                      }
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <AnimatePresence mode="wait">
                {isPending ? (
                  <tr key="loading"><td colSpan={columns.length} className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--health-green-500)]" /></td></tr>
                ) : data.length === 0 ? (
                  <tr key="empty"><td colSpan={columns.length} className="py-16 text-center text-sm text-[var(--foreground-muted)]">No staff found</td></tr>
                ) : (
                  table.getRowModel().rows.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => onRowClick(row.original)}
                      className="cursor-pointer transition-colors hover:bg-[var(--background-subtle)]"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
          <span className="text-xs text-[var(--foreground-muted)]">Page {pagination.page} of {pagination.pages}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={pagination.page <= 1 || isPending} onClick={() => fetchData(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages || isPending} onClick={() => fetchData(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
