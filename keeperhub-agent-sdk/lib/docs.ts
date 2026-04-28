export const docs = {
  "python-langchain": {
    title: "Python LangChain",
    subtitle:
      "The primary package: 31 tools for live KeeperHub execution from LangChain or LangGraph agents.",
    install: "pip install -e packages/langchain-keeperhub",
    sections: [
      {
        heading: "What It Proves",
        body: [
          "Live KeeperHub execution through Python agent tools.",
          "Reliable outputs: tools return JSON strings with ok, summary, execution IDs, and retry guidance.",
          "Read and write coverage across chains, ABI, contract calls, workflows, wallet, ENS, and payments.",
        ],
      },
      {
        heading: "Core Tools",
        body: [
          "Web3: list chains, fetch ABI, contract calls, transfers, check-and-execute, gas estimate.",
          "Workflows: list, execute, generate, status, version, migrate, publish.",
          "Agent utility: register agent, wallet balance, provision wallet, ENS, action schema, protocol action, pay-and-run.",
        ],
      },
      {
        heading: "Live Command",
        body: [
          "cd packages/langchain-keeperhub && python tests/run_all.py",
          "Expected current result: 18 pass, 0 fail, with gas estimate and Chainlink price marked as KeeperHub-side issues.",
        ],
      },
    ],
  },
  "typescript-langchain": {
    title: "TypeScript LangChain",
    subtitle:
      "A LangChain toolkit for TypeScript agents that need KeeperHub tools, paid workflow discovery, and live execution.",
    install: "pnpm --dir packages/langchain-tools build",
    sections: [
      {
        heading: "What It Proves",
        body: [
          "Agents can use KeeperHub from the standard LangChain tool surface.",
          "The x402/MPP demo uses the actual tool to reach a real paid workflow challenge.",
          "Tool names and schemas are stable enough for agent planners to choose actions.",
        ],
      },
      {
        heading: "x402 and MPP Demo",
        body: [
          "Lists public workflows from /api/mcp/workflows.",
          "Executes the free listed workflow helloworld.",
          "Calls microtip and stops safely at the real 402 challenge.",
          "Reports MPP/Tempo from WWW-Authenticate and x402 from X-PAYMENT-REQUIREMENTS.",
        ],
      },
    ],
  },
  elizaos: {
    title: "ElizaOS Plugin",
    subtitle:
      "A plugin that gives ElizaOS agents KeeperHub actions, providers, and execution success evaluation.",
    install: "pnpm --dir packages/elizaos-plugin build",
    sections: [
      {
        heading: "What It Proves",
        body: [
          "KeeperHub can be installed as an ElizaOS plugin with actions, providers, and evaluator.",
          "The plugin can run live safe actions and surface wallet/workflow context to an agent.",
          "Payment-gated listed workflows return a structured MPP/x402 challenge instead of crashing the agent loop.",
        ],
      },
      {
        heading: "Plugin Coverage",
        body: [
          "Actions include workflows, execution status, register agent, web3, protocol actions, payments, notifications, code, schema lookup, and workflow migration.",
          "Providers expose wallet and workflow context.",
          "Evaluator detects execution IDs in conversation and polls outcomes.",
        ],
      },
    ],
  },
  sdk: {
    title: "Raw TypeScript SDK",
    subtitle:
      "The lower-level SDK powering the framework packages and exposing KeeperHub primitives directly.",
    install: "pnpm --dir packages/sdk build",
    sections: [
      {
        heading: "What It Proves",
        body: [
          "Framework integrations are built on a reusable client rather than ad hoc HTTP snippets.",
          "SDK modules cover workflows, executions, web3, protocols, wallet, MCP, payments, agent registry, integrations, and events.",
          "Live tests prove request shapes for KeeperHub action execution, wallet token response normalization, and execution status fallback.",
        ],
      },
      {
        heading: "Payment Support",
        body: [
          "Catalog discovery uses /api/mcp/workflows.",
          "Paid calls throw a typed KeeperHubPaymentRequiredError.",
          "The resolver callback receives protocol mpp when KeeperHub offers Tempo payment.",
        ],
      },
    ],
  },
  "live-api-notes": {
    title: "Live API Notes",
    subtitle:
      "Honest integration notes from testing KeeperHub under hackathon conditions.",
    install: "See FEEDBACK.md for full bug report details.",
    sections: [
      {
        heading: "Confirmed Live Paths",
        body: [
          "Chains, ABI, contract read, wallet, token list workaround, workflows, execution status, Sepolia transfer, ENS, agent registry, MCP schemas, code/run-code, and x402/MPP challenge discovery.",
          "LangChain Python, LangChain TypeScript, ElizaOS, and raw SDK all load and run live-safe flows.",
        ],
      },
      {
        heading: "Known KeeperHub-side Issues",
        body: [
          "Gas estimate returns 500 from the current API.",
          "Chainlink price feed returns 422 Invalid _protocolMeta.",
          "Discord/Telegram/SendGrid/Webhook connections were not visible through /api/integrations for the current API key during live tests.",
        ],
      },
      {
        heading: "Payment Reality",
        body: [
          "Sepolia ETH funds test execution, not x402/MPP settlement.",
          "x402 uses Base mainnet USDC.",
          "MPP uses Tempo USDC.e.",
          "This showcase stops at the challenge unless a payment signer is configured.",
        ],
      },
    ],
  },
} as const;

export type DocSlug = keyof typeof docs;
