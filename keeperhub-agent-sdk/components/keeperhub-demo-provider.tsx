"use client";

import { KeeperHubProvider } from "keeperhub-sdk/react";

function getProxyBaseUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:3100/keeperhub-proxy";
  }

  return `${window.location.origin}/keeperhub-proxy`;
}

export function KeeperHubDemoProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <KeeperHubProvider apiKey="proxy" baseUrl={getProxyBaseUrl()}>
      {children}
    </KeeperHubProvider>
  );
}
