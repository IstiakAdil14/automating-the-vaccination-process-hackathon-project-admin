"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, Users, User, FileText, Clock, X, Loader2 } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList,
  CommandEmpty, CommandGroup, CommandItem, CommandSeparator,
} from "@/components/ui/command";
import { useDebounce } from "@/hooks/useDebounce";
import type { SearchResult } from "@/app/api/admin/search/route";

const STORAGE_KEY = "admin_recent_searches";
const MAX_RECENT  = 5;

const TYPE_ICONS: Record<SearchResult["type"], React.ReactNode> = {
  center:  <Building2 className="h-4 w-4 text-blue-400" />,
  staff:   <Users     className="h-4 w-4 text-purple-400" />,
  citizen: <User      className="h-4 w-4 text-green-400" />,
  page:    <FileText  className="h-4 w-4 text-[var(--foreground-muted)]" />,
};

function getRecent(): SearchResult[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(item: SearchResult) {
  const prev = getRecent().filter((r) => r.id !== item.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...prev].slice(0, MAX_RECENT)));
}

/* --- Hook to open/close via Cmd+K -------------------------------------------- */
export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}

/* --- Component ---------------------------------------------------------------- */
interface GlobalSearchProps {
  open:    boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router  = useRouter();
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent,  setRecent]  = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const debounced = useDebounce(query, 250);
  const abortRef  = useRef<AbortController | null>(null);

  /* Load recent on open */
  useEffect(() => {
    if (open) setRecent(getRecent());
  }, [open]);

  /* Fetch results */
  useEffect(() => {
    if (!debounced || debounced.length < 2) { setResults([]); return; }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    startTransition(async () => {
      try {
        const res  = await fetch(`/api/admin/search?q=${encodeURIComponent(debounced)}`, {
          signal: abortRef.current!.signal,
        });
        const json = await res.json() as { results: SearchResult[] };
        setResults(json.results ?? []);
      } catch {
        /* AbortError - ignore */
      }
    });
  }, [debounced]);

  const handleSelect = useCallback((item: SearchResult) => {
    saveRecent(item);
    setRecent(getRecent());
    onClose();
    setQuery("");
    router.push(item.href);
  }, [onClose, router]);

  /* Group results by type */
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  const GROUP_LABELS: Record<string, string> = {
    page:    "Pages",
    center:  "Centers",
    staff:   "Staff",
    citizen: "Citizens",
  };

  return (
    <CommandDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <div className="flex items-center border-b border-[var(--border)] px-3">
        {isPending
          ? <Loader2 className="h-4 w-4 animate-spin text-[var(--foreground-muted)]" />
          : <Search className="h-4 w-4 text-[var(--foreground-muted)]" />
        }
        <CommandInput
          placeholder="Search centers, staff, citizens, pages-"
          value={query}
          onValueChange={setQuery}
          className="border-0 focus:ring-0"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <CommandList className="max-h-[420px]">
        {!query && recent.length > 0 && (
          <CommandGroup heading="Recent">
            {recent.map((item) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3"
              >
                <Clock className="h-4 w-4 text-[var(--foreground-subtle)]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-[var(--foreground-muted)] truncate">{item.subtitle}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query.length >= 2 && results.length === 0 && !isPending && (
          <CommandEmpty>No results for &ldquo;{query}&rdquo;</CommandEmpty>
        )}

        {Object.entries(grouped).map(([type, items], i) => (
          <div key={type}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={GROUP_LABELS[type] ?? type}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.type}-${item.id}`}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3"
                >
                  {TYPE_ICONS[item.type]}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-[var(--foreground-muted)] truncate">{item.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>

      <div className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-2">
        <span className="kbd">--</span>
        <span className="text-xs text-[var(--foreground-muted)]">navigate</span>
        <span className="kbd">-</span>
        <span className="text-xs text-[var(--foreground-muted)]">open</span>
        <span className="kbd ml-auto">Esc</span>
        <span className="text-xs text-[var(--foreground-muted)]">close</span>
      </div>
    </CommandDialog>
  );
}
