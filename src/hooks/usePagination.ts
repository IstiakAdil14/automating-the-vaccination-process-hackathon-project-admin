"use client";

import { useState, useCallback } from "react";

export interface PaginationState {
  page:    number;
  limit:   number;
  total:   number;
  pages:   number;
}

export interface PaginationActions {
  setPage:   (page: number) => void;
  setLimit:  (limit: number) => void;
  setTotal:  (total: number) => void;
  nextPage:  () => void;
  prevPage:  () => void;
  reset:     () => void;
}

export function usePagination(initialLimit = 20): PaginationState & PaginationActions {
  const [page,  setPageState]  = useState(1);
  const [limit, setLimitState] = useState(initialLimit);
  const [total, setTotalState] = useState(0);

  const pages = Math.max(1, Math.ceil(total / limit));

  const setPage  = useCallback((p: number) => setPageState(Math.max(1, Math.min(p, Math.ceil(total / limit)))), [total, limit]);
  const setLimit = useCallback((l: number) => { setLimitState(l); setPageState(1); }, []);
  const setTotal = useCallback((t: number) => { setTotalState(t); }, []);
  const nextPage = useCallback(() => setPageState((p) => Math.min(p + 1, Math.ceil(total / limit))), [total, limit]);
  const prevPage = useCallback(() => setPageState((p) => Math.max(p - 1, 1)), []);
  const reset    = useCallback(() => { setPageState(1); setTotalState(0); }, []);

  return { page, limit, total, pages, setPage, setLimit, setTotal, nextPage, prevPage, reset };
}
