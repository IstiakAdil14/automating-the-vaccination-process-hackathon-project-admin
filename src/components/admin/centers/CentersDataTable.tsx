"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, Loader2, Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { Center, CenterType, CenterStatus } from "@/types";

/* --- Constants ---------------------------------------------------------------- */
const DIVISIONS = ["Dhaka","Chittagong","Sylhet","Rajshahi","Khulna","Barisal","Rangpur","Mymensingh"];

const TYPE_LABELS: Record<CenterType, string> = {
  GOVT_HOSPITAL:  "Govt Hospital",
  PRIVATE_CLINIC: "Private Clinic",
  COMMUNITY:      "Community",
  MOBILE:         "Mobile Unit",
};

const TYPE_COLORS: Record<CenterType, string> = {
  GOVT_HOSPITAL:  "bg-[var(--info-subtle)] text-[var(--info)]",
  PRIVATE_CLINIC: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  COMMUNITY:      "bg-[var(--accent-subtle)] text-[var(--accent)]",
  MOBILE:         "bg-[var(--warning-subtle)] text-[var(--warning-foreground)]",
};

const STATUS_COLORS: Record<CenterStatus, string> = {
  ACTIVE:    "bg-[var(--accent-subtle)] text-[var(--accent)]",
  PENDING:   "bg-[var(--warning-subtle)] text-[var(--warning-foreground)]",
  SUSPENDED: "bg-[var(--danger-subtle)] text-[var(--danger)]",
};

/* --- Debounce hook ------------------------------------------------------------ */
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* --- Types -------------------------------------------------------------------- */
interface Pagination { page: number; limit: number; total: number; pages: number }

interface CentersDataTableProps {
  statusFilter?: CenterStatus;
  onRowClick:    (center: Center) => void;
}

/* --- Column definitions ------------------------------------------------------- */
function buildColumns(onRowClick: (c: Center) => void): ColumnDef<Center>[] {
  return [
    {
      id:     "name",
      header: "Center Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--background-subtle)]">
            <Building2 className="h-4 w-4 text-[var(--foreground-muted)]" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--foreground)]">{row.original.name}</p>
            <p className="truncate text-xs text-[var(--foreground-muted)]">{row.original.licenseNo}</p>
          </div>
        </div>
      ),
    },
    {
      id:     "location",
      header: "Division / District",
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-[var(--foreground)]">{row.original.address.division}</p>
          <p className="text-xs text-[var(--foreground-muted)]">{row.original.address.district}</p>
        </div>
      ),
    },
    {
      id:     "type",
      header: "Type",
      accessorKey: "type",
      cell: ({ row }) => (
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", TYPE_COLORS[row.original.type])}>
          {TYPE_LABELS[row.original.type]}
        </span>
      ),
    },
    {
      id:     "status",
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => (
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_COLORS[row.original.status])}>
          {row.original.status}
        </span>
      ),
    },
    {
      id:     "totalVaccinations",
      header: "Total Vaccinations",
      accessorKey: "totalVaccinations",
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums text-[var(--foreground)]">
          {formatNumber(row.original.totalVaccinations)}
        </span>
      ),
    },
    {
      id:     "createdAt",
      header: "Registered",
      accessorKey: "createdAt",
      cell: ({ row }) => (
        <span className="text-sm text-[var(--foreground-muted)]">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id:   "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); onRowClick(row.original); }}
          className="text-xs"
        >
          View
        </Button>
      ),
    },
  ];
}

/* --- Sort header -------------------------------------------------------------- */
function SortHeader({ label, colId, sorting, onSort }: {
  label:   string;
  colId:   string;
  sorting: SortingState;
  onSort:  (id: string) => void;
}) {
  const active = sorting[0]?.id === colId;
  const desc   = sorting[0]?.desc;
  return (
    <button
      onClick={() => onSort(colId)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
    >
      {label}
      {active
        ? desc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
        : <ChevronsUpDown className="h-3 w-3 opacity-40" />
      }
    </button>
  );
}

/* --- CentersDataTable --------------------------------------------------------- */
export function CentersDataTable({ statusFilter, onRowClick }: CentersDataTableProps) {
  const [data,       setData]       = useState<Center[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search,     setSearch]     = useState("");
  const [division,   setDivision]   = useState("all");
  const [type,       setType]       = useState("all");
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
      if (statusFilter)          params.set("status",   statusFilter);
      if (division !== "all")    params.set("division", division);
      if (type     !== "all")    params.set("type",     type);

      const res  = await fetch(`/api/admin/centers?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination);
    });
  }, [debouncedSearch, sorting, statusFilter, division, type]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  function handleSort(colId: string) {
    setSorting((prev) => {
      if (prev[0]?.id === colId) return [{ id: colId, desc: !prev[0].desc }];
      return [{ id: colId, desc: true }];
    });
  }

  const columns = buildColumns(onRowClick);
  const table   = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting:    true,
    state: { sorting },
  });

  const SORTABLE = ["name", "totalVaccinations", "createdAt", "status"];

  return (
    <div className="flex flex-col gap-4">
      {/* -- Toolbar -- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <Input
            placeholder="Search name, license, district-"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={division} onValueChange={setDivision}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-[var(--foreground-muted)]">
          {formatNumber(pagination.total)} centers
        </span>
      </div>

      {/* -- Table -- */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 text-left">
                      {SORTABLE.includes(header.id)
                        ? <SortHeader label={header.id === "totalVaccinations" ? "Vaccinations" : header.id === "createdAt" ? "Registered" : header.id} colId={header.id} sorting={sorting} onSort={handleSort} />
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
                  <tr key="loading">
                    <td colSpan={columns.length} className="py-16 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--health-green-500)]" />
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr key="empty">
                    <td colSpan={columns.length} className="py-16 text-center text-sm text-[var(--foreground-muted)]">
                      No centers found
                    </td>
                  </tr>
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

        {/* -- Pagination -- */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
          <span className="text-xs text-[var(--foreground-muted)]">
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="outline"
              disabled={pagination.page <= 1 || isPending}
              onClick={() => fetchData(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm" variant="outline"
              disabled={pagination.page >= pagination.pages || isPending}
              onClick={() => fetchData(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
