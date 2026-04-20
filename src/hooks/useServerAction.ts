"use client";

import { useState, useTransition, useCallback } from "react";

export interface ServerActionState<T> {
  data:      T | null;
  error:     string | null;
  isPending: boolean;
}

export interface ServerActionReturn<TArgs extends unknown[], TData> extends ServerActionState<TData> {
  execute: (...args: TArgs) => Promise<void>;
  reset:   () => void;
}

/**
 * Wraps a server action with loading/error/data state.
 *
 * @example
 * const { execute, isPending, error } = useServerAction(createVaccine);
 * await execute({ name: "BCG", ... });
 */
export function useServerAction<TArgs extends unknown[], TData>(
  action: (...args: TArgs) => Promise<{ ok: boolean; data?: TData; error?: string }>
): ServerActionReturn<TArgs, TData> {
  const [data,  setData]  = useState<TData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const execute = useCallback(
    (...args: TArgs) =>
      new Promise<void>((resolve) => {
        setError(null);
        startTransition(async () => {
          try {
            const result = await action(...args);
            if (result.ok) {
              setData(result.data ?? null);
            } else {
              setError(result.error ?? "An unexpected error occurred");
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
          } finally {
            resolve();
          }
        });
      }),
    [action]
  );

  const reset = useCallback(() => { setData(null); setError(null); }, []);

  return { data, error, isPending, execute, reset };
}
