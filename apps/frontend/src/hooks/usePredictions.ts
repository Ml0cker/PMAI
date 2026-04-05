'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { useWebSocket } from './useWebSocket';
import { useEffect, useRef } from 'react';

interface Prediction {
  id: string;
  prediction: string;
  confidence: number;
  reasoning: string[];
  modelVersion: string;
  createdAt: string;
  market: {
    id: string;
    question: string;
    slug: string;
    currentYesPrice: string;
    currentNoPrice: string;
  };
}

interface PredictionsResponse {
  predictions: Prediction[];
  total: number;
  page: number;
  limit: number;
}

// Module-level cache — survives component re-mounts across navigation
let stablePredictions: Prediction[] = [];
let stableTotal = 0;
let hasLoadedOnce = false;

export function usePredictions(params: { marketId?: string; page?: number; limit?: number } = {}) {
  const { subscribe } = useWebSocket();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const searchParams = new URLSearchParams();
  if (params.marketId) searchParams.set('marketId', params.marketId);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  const { data, error, isLoading, mutate } = useSWR<PredictionsResponse>(
    `/predictions?${searchParams.toString()}`,
    (url: string) => apiClient.get<PredictionsResponse>(url),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount: retryCount + 1 }), 3000);
      },
    }
  );

  // Sync SWR data into module-level cache
  useEffect(() => {
    if (!mountedRef.current) return;
    if (data) {
      hasLoadedOnce = true;
      stablePredictions = data.predictions;
      stableTotal = data.total;
    }
  }, [data]);

  useEffect(() => {
    const unsubscribe = subscribe('prediction:complete', () => {
      mutate();
    });
    return unsubscribe;
  }, [subscribe, mutate]);

  // Always return stable data — module-level cache survives re-mounts
  const predictions = data?.predictions?.length ? data.predictions : stablePredictions;
  const total = data?.total || stableTotal;
  const isInitialLoading = isLoading && !hasLoadedOnce && !error;

  return {
    predictions,
    total,
    isLoading: isInitialLoading,
    error,
    mutate,
  };
}

export function usePrediction(id: string) {
  const { data, error, isLoading } = useSWR(
    id ? `/predictions/${id}` : null,
    (url: string) => apiClient.get<Prediction>(url)
  );

  return { prediction: data, isLoading, error };
}
