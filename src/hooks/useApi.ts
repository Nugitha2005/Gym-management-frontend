import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** Re-fetch silently every N ms (used for live screens like "Who's inside"). */
  refreshMs?: number;
  /** Skip loading until this is true. */
  enabled?: boolean;
}

export interface ApiState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  /** Re-run the loader. `silent` keeps the current data on screen while it loads. */
  reload: (silent?: boolean) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

/**
 * Load data from the API when a screen mounts.
 * Ignores out-of-date responses if the loader runs again before the last one finished.
 */
export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = [], options: Options = {}): ApiState<T> {
  const { refreshMs, enabled = true } = options;
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const requestId = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async (silent = false) => {
    const id = ++requestId.current;
    if (!silent) setLoading(true);
    try {
      const result = await loaderRef.current();
      if (id === requestId.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (id === requestId.current) setError(err);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload, ...deps]);

  useEffect(() => {
    if (!enabled || !refreshMs) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload(true);
    }, refreshMs);
    return () => window.clearInterval(timer);
  }, [enabled, refreshMs, reload]);

  return { data, error, loading, reload, setData };
}
