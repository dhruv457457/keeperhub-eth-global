import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { AnalyticsStream } from "../../core/analytics.js";
import type {
  AnalyticsRange,
  AnalyticsRun,
  AnalyticsSummary,
  AnalyticsTimeSeriesPoint,
  NetworkUsage,
} from "../../types/index.js";
import { useKeeperHub } from "../context.js";

export function useAnalyticsSummary(options?: {
  range?: AnalyticsRange;
  projectId?: string;
}) {
  const kh = useKeeperHub();
  return useQuery<AnalyticsSummary>({
    queryKey: ["analytics-summary", options],
    queryFn: () => kh.analytics.summary(options),
    staleTime: 60_000,
  });
}

export function useAnalyticsRuns(options?: {
  range?: AnalyticsRange;
  projectId?: string;
}) {
  const kh = useKeeperHub();
  return useQuery<AnalyticsRun[]>({
    queryKey: ["analytics-runs", options],
    queryFn: () => kh.analytics.runs(options),
    staleTime: 60_000,
  });
}

export function useAnalyticsTimeSeries(options?: { range?: AnalyticsRange }) {
  const kh = useKeeperHub();
  return useQuery<AnalyticsTimeSeriesPoint[]>({
    queryKey: ["analytics-time-series", options],
    queryFn: () => kh.analytics.timeSeries(options),
    staleTime: 60_000,
  });
}

export function useAnalyticsNetworks() {
  const kh = useKeeperHub();
  return useQuery<NetworkUsage[]>({
    queryKey: ["analytics-networks"],
    queryFn: () => kh.analytics.networks(),
    staleTime: 60_000,
  });
}

export function useGasCredits() {
  const kh = useKeeperHub();
  return useQuery<{
    limit: number;
    used: number;
    remaining: number;
    percentUsed: number;
  }>({
    queryKey: ["gas-credits"],
    queryFn: () => kh.analytics.spendCap(),
    staleTime: 30_000,
  });
}

/** Live WebSocket stream — fires on every execution event */
export function useAnalyticsStream() {
  const kh = useKeeperHub();
  const streamRef = useRef<AnalyticsStream | null>(null);
  const [events, setEvents] = useState<unknown[]>([]);

  useEffect(() => {
    const stream = kh.analytics.stream();
    streamRef.current = stream;

    stream.on("event", (data) => {
      setEvents((prev) => [...prev.slice(-99), data]);
    });

    return () => stream.close();
  }, [kh]);

  return { events };
}
