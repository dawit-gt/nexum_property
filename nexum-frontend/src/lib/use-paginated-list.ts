'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import type { PaginatedResult } from '@/types/api';

/** Returns `value` only after it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

interface Options {
  /** Wait (for example until the admin guard has finished) before fetching. */
  enabled: boolean;
  limit?: number;
}

/**
 * Loads a paginated list with "Load more". Changing `filters` starts again
 * from page 1; stale responses from an older filter are ignored.
 */
export function usePaginatedList<T, P extends { page?: number; limit?: number }>(
  fetcher: (params: P) => Promise<PaginatedResult<T>>,
  filters: Omit<P, 'page' | 'limit'>,
  { enabled, limit = 10 }: Options,
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const filtersKey = JSON.stringify(filters);

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      const requestId = ++latestRequest.current;

      try {
        const params = { ...JSON.parse(filtersKey), page: targetPage, limit } as P;
        const result = await fetcher(params);
        if (requestId !== latestRequest.current) return;

        setItems((prev) => (append ? [...prev, ...result.data] : result.data));
        setPage(targetPage);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
        setError(null);
      } catch (err) {
        if (requestId !== latestRequest.current) return;
        setError(getApiErrorMessage(err));
      } finally {
        if (requestId === latestRequest.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [fetcher, filtersKey, limit],
  );

  useEffect(() => {
    if (!enabled) return;
    queueMicrotask(() => {
      setIsLoading(true);
      void fetchPage(1, false);
    });
  }, [enabled, fetchPage]);

  const loadMore = useCallback(() => {
    setIsLoadingMore(true);
    void fetchPage(page + 1, true);
  }, [fetchPage, page]);

  /** Refetches the first page in place (no loading flash), e.g. after an approval. */
  const reload = useCallback(() => fetchPage(1, false), [fetchPage]);

  return {
    items,
    total,
    hasMore: page < totalPages,
    isLoading,
    isLoadingMore,
    error,
    setError,
    loadMore,
    reload,
  };
}