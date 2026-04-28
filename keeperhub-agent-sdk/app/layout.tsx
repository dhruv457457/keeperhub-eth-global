import type { Metadata } from "next";
import Link from "next/link";
import { KeeperHubDemoProvider } from "@/components/keeperhub-demo-provider";
import "./styles.css";

export const metadata: Metadata = {
  title: "KeeperHub Agent SDK",
  description:
    "Product-quality hackathon examples for KeeperHub across React hooks, LangChain, ElizaOS, payments, workflows, and Python.",
};

const navItems = [
  ["Home", "/"],
  ["Dashboard", "/examples/react-agent-dashboard"],
  ["ElizaOS", "/examples/eliza-agent-operator"],
  ["LangChain", "/examples/langchain-paid-agent"],
  ["Python", "/examples/python-strategy-executor"],
  ["Docs", "/docs/sdk"],
] as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <KeeperHubDemoProvider>
          <header className="site-header">
            <Link className="brand" href="/">
              KeeperHub Agent SDK
            </Link>
            <nav aria-label="Main navigation" className="top-nav">
              {navItems.map(([label, href]) => (
                <Link href={href} key={href}>
                  {label}
                </Link>
              ))}
            </nav>
          </header>
          {children}
        </KeeperHubDemoProvider>
      </body>
    </html>
  );
}
