"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

const DIVISIONS = ["Dhaka","Chittagong","Sylhet","Rajshahi","Khulna","Barisal","Rangpur","Mymensingh"];

export interface SearchFilters {
  query:             string;
  division:          string;
  vaccinationStatus: string;
  dateFrom:          string;
  dateTo:            string;
}

interface Props {
  total:    number;
  loading:  boolean;
  onChange: (filters: SearchFilters) => void;
}

function useDebounce<T>(value: T, delay = 500): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

export function CitizenSearchBar({ total, loading, onChange }: Props) {
  const [query,    setQuery]    = useState("");
  const [division, setDivision] = useState("all");
  const [status,   setStatus]   = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  const debouncedQuery = useDebounce(query);

  useEffect(() => {
    onChange({
      query:             debouncedQuery,
      division:          division === "all" ? "" : division,
      vaccinationStatus: status   === "all" ? "" : status,
      dateFrom,
      dateTo,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, division, status, dateFrom, dateTo]);

  function reset() {
    setQuery(""); setDivision("all"); setStatus("all"); setDateFrom(""); setDateTo("");
  }

  const hasFilters = query || division !== "all" || status !== "all" || dateFrom || dateTo;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <Input
            placeholder="Search by name, NID, phone, email-"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Division */}
        <Select value={division} onValueChange={setDivision}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Division" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Vaccination status */}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Vax Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="UNVACCINATED">Unvaccinated</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="COMPLETE">Complete</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
        />
        <span className="text-xs text-[var(--foreground-muted)]">to</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
        />

        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={reset} className="text-xs text-[var(--foreground-muted)]">
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}

        <span className="ml-auto text-xs text-[var(--foreground-muted)]">
          {loading ? "Searching-" : `${formatNumber(total)} citizen${total !== 1 ? "s" : ""}`}
        </span>
      </div>
    </div>
  );
}
