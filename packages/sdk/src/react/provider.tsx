import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useMemo } from "react";
import { KeeperHub } from "../core/index.js";
import type { KeeperHubConfig } from "../types/index.js";
import { KeeperHubContext } from "./context.js";

interface KeeperHubProviderProps extends KeeperHubConfig {
  children: ReactNode;
  /** Bring your own QueryClient if you already have one in your app */
  queryClient?: QueryClient;
}

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function KeeperHubProvider({
  children,
  queryClient,
  ...config
}: KeeperHubProviderProps) {
  const client = useMemo(
    () => new KeeperHub(config),
    // Include all config fields so a changed timeout/retry creates a new client
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.apiKey, config.baseUrl, config.timeout, JSON.stringify(config.retry)]
  );
  const qc = queryClient ?? defaultQueryClient;

  return (
    <QueryClientProvider client={qc}>
      <KeeperHubContext.Provider value={client}>
        {children}
      </KeeperHubContext.Provider>
    </QueryClientProvider>
  );
}
