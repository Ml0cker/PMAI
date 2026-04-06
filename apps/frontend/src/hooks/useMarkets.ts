'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { useWebSocket } from './useWebSocket';
import { useEffect, useState, useCallback, useRef } from 'react';

interface Market {
  id: string;
  question: string;
  slug: string;
  outcomes: string[];
  outcomePrices: string[];
  volume24hr: number | null;
  volume: number | null;
  liquidity: number | null;
  active: boolean;
  closed: boolean;
  category: string | null;
  eventTitle: string | null;
  imageUrl: string | null;
  latestPrediction: {
    id: string;
    prediction: string;
    confidence: number;
  } | null;
}

interface MarketsResponse {
  markets: Market[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 20;

// Module-level cache — survives component re-mounts across navigation
let stableMarkets: Market[] = [];
let stableTotal = 0;
let stableHasFetched = false;

export function useMarkets(params: { category?: string; sort?: string } = {}) {
  const { subscribe } = useWebSocket();
  const [page, setPage] = useState(1);
  const [allMarkets, setAllMarkets] = useState<Market[]>(() => stableMarkets);
  const [total, setTotal] = useState(() => stableTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasFetched, setHasFetched] = useState(() => stableHasFetched);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set('category', params.category);
  if (params.sort) searchParams.set('sort', params.sort);

  const filterKey = searchParams.toString();
  const swrKey = `/markets?${filterKey}&page=${page}&limit=${PAGE_SIZE}`;

  const { data, error, isLoading, mutate } = useSWR<MarketsResponse>(
    swrKey,
    (url: string) => apiClient.get<MarketsResponse>(url),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount: retryCount + 1 }), 3000);
      },
    }
  );

  // Sync SWR data into state + module-level cache
  useEffect(() => {
    if (!mountedRef.current) return;
    if (data) {
      const nextMarkets = page === 1
        ? data.markets
        : (() => {
            const ids = new Set(allMarkets.map(m => m.id));
            const fresh = data.markets.filter(m => !ids.has(m.id));
            return [...allMarkets, ...fresh];
          })();

      setHasFetched(true);
      setTotal(data.total);
      setAllMarkets(nextMarkets);
      setIsLoadingMore(false);

      stableMarkets = nextMarkets;
      stableTotal = data.total;
      stableHasFetched = true;
    }
  }, [data, page]);

  // Reset on filter change
  useEffect(() => {
    if (!mountedRef.current) return;
    setPage(1);
    setAllMarkets([]);
    setTotal(0);
    setHasFetched(false);
    setIsLoadingMore(false);
    stableMarkets = [];
    stableTotal = 0;
    stableHasFetched = false;
  }, [filterKey]);

  useEffect(() => {
    const unsubscribe = subscribe('price:change', () => {
      mutate();
    });
    return unsubscribe;
  }, [subscribe, mutate]);

  const hasMore = allMarkets.length < total && total > 0;

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setPage(prev => prev + 1);
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const isInitialLoading = (isLoading && !hasFetched) || (!data && !error && !hasFetched);

  return {
    markets: allMarkets,
    total,
    isLoading: isInitialLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    sentinelRef,
    error,
    mutate,
  };
}

// Module-level cache for single market lookups
const marketCache = new Map<string, unknown>();

export function useMarket(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/markets/${id}` : null,
    (url: string) => apiClient.get<unknown>(url),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount: retryCount + 1 }), 3000);
      },
    }
  );

  // Persist to module-level cache
  useEffect(() => {
    if (data) marketCache.set(id, data);
  }, [data, id]);

  const market = data || marketCache.get(id);

  return { market, isLoading, error, mutate };
}
