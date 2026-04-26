import { createContext, useContext } from "react";
import type { KeeperHub } from "../core/index.js";

export const KeeperHubContext = createContext<KeeperHub | null>(null);

export function useKeeperHub(): KeeperHub {
  const client = useContext(KeeperHubContext);
  if (!client) {
    throw new Error(
      "useKeeperHub must be used inside <KeeperHubProvider>. " +
        'Wrap your app with <KeeperHubProvider apiKey="...">.'
    );
  }
  return client;
}
