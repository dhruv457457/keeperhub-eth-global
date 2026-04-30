"""KeeperHub LangChain Toolkit — bundles all tools for agent use."""

from __future__ import annotations

import json
import os
from typing import Any, Literal, Sequence

from langchain_core.tools import BaseTool

from langchain_keeperhub.client import KeeperHubClient
from langchain_keeperhub.tools import (
    # Chain & contract
    CheckAndExecuteTool,
    ContractCallTool,
    EstimateGasTool,
    FetchContractABITool,
    ListChainsTool,
    TransferFundsTool,
    # Workflows
    ExecuteWorkflowTool,
    GenerateWorkflowTool,
    GetExecutionStatusTool,
    ListWorkflowsTool,
    ListExecutionsTool,
    # DeFi protocols
    ListProtocolsTool,
    ProtocolActionTool,
    # Payments
    PayAndRunTool,
    # Agent identity & wallet
    ProvisionWalletTool,
    RegisterAgentTool,
    WalletBalanceTool,
    # Notifications
    ListIntegrationsTool,
    NotifyTool,
    # Chainlink + Ajna + Utility plugins
    AjnaTool,
    ChainlinkCcipTool,
    ChainlinkPriceFeedTool,
    CodeExecuteTool,
    MathAggregateTool,
    # Action schema discovery
    GetActionSchemaTool,
    SearchActionsTool,
    # Workflow versioning & migration
    PublishWorkflowTool,
    WorkflowMigrateTool,
    WorkflowVersionTool,
    # ENS
    EnsLookupTool,
    EnsResolveTool,
    EnsTextRecordTool,
)

# Testnets known to KeeperHub (chain IDs as strings)
_TESTNET_CHAIN_IDS: frozenset[str] = frozenset({
    "11155111",  # Ethereum Sepolia
    "84532",     # Base Sepolia
    "80002",     # Polygon Amoy
    "421614",    # Arbitrum Sepolia
    "43113",     # Avalanche Fuji
    "4217",      # Tempo (KeeperHub MPP testnet)
    "80084",     # Berachain bArtio testnet
})

# Write tools that check chain ID when testnet_only=True
_WRITE_TOOL_KEYS = frozenset({"transfer", "contract_call", "check_and_execute"})

ToolKey = Literal[
    "list_chains",
    "fetch_abi",
    "transfer",
    "contract_call",
    "check_and_execute",
    "estimate_gas",
    "list_workflows",
    "execute_workflow",
    "generate_workflow",
    "execution_status",
    "list_executions",
    "list_protocols",
    "protocol_action",
    "pay_and_run",
    "register_agent",
    "wallet_balance",
    "provision_wallet",
    "notify",
    "list_integrations",
    "chainlink_ccip",
    "chainlink_price",
    "ajna",
    "run_code",
    "math_aggregate",
    "get_action_schema",
    "search_actions",
    "workflow_version",
    "workflow_migrate",
    "workflow_publish",
    "ens_resolve",
    "ens_text_record",
    "ens_lookup",
]

ALL_TOOLS: tuple[ToolKey, ...] = (
    "list_chains",
    "fetch_abi",
    "transfer",
    "contract_call",
    "check_and_execute",
    "estimate_gas",
    "list_workflows",
    "execute_workflow",
    "generate_workflow",
    "execution_status",
    "list_protocols",
    "protocol_action",
    "pay_and_run",
    "register_agent",
    "wallet_balance",
    "provision_wallet",
    "notify",
    "list_integrations",
    "chainlink_ccip",
    "chainlink_price",
    "ajna",
    "run_code",
    "math_aggregate",
    "get_action_schema",
    "search_actions",
    "workflow_version",
    "workflow_migrate",
    "workflow_publish",
    "ens_resolve",
    "ens_text_record",
    "ens_lookup",
)


class _TestnetGuardTool(BaseTool):
    """
    Wraps a write tool and blocks mainnet calls when testnet_only=True.
    Checks the 'network' parameter before delegating to the inner tool.
    """
    name: str = ""
    description: str = ""
    inner: object = None  # BaseTool
    testnet_ids: frozenset = frozenset()
    allowed_ids: frozenset | None = None

    model_config = {"arbitrary_types_allowed": True}

    def _is_blocked(self, network: str | None) -> str | None:
        """Return error message if blocked, else None."""
        if network is None:
            return None
        net = str(network)
        if self.allowed_ids is not None and net not in self.allowed_ids:
            return f"Chain {net} is not in your allowed_chain_ids allowlist."
        if net not in self.testnet_ids:
            return (
                f"testnet_only mode — mainnet write blocked (chain {net}). "
                f"Use a testnet chain ID: {', '.join(sorted(self.testnet_ids))}."
            )
        return None

    async def _arun(self, **kwargs: Any) -> str:  # type: ignore[override]
        network = kwargs.get("network") or kwargs.get("chain_id")
        err = self._is_blocked(str(network) if network is not None else None)
        if err:
            return json.dumps({"ok": False, "error": err})
        return await self.inner._arun(**kwargs)  # type: ignore[union-attr]

    def _run(self, **kwargs: Any) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


class KeeperHubToolkit:
    """
    KeeperHub LangChain Toolkit.

    Bundles 31 tools covering web3 operations, DeFi protocols, workflow management,
    ENS resolution, payments, agent identity, and AI workflow generation.

    Quick start::

        from langchain_keeperhub import KeeperHubToolkit
        from langgraph.prebuilt import create_react_agent

        toolkit = KeeperHubToolkit()  # reads KEEPERHUB_API_KEY from env
        agent = create_react_agent(llm, tools=toolkit.get_tools())

    Safety guardrails::

        # Block all mainnet write calls — safe for development
        toolkit = KeeperHubToolkit(testnet_only=True)

        # Restrict to specific chains only
        toolkit = KeeperHubToolkit(allowed_chain_ids={"11155111", "84532"})

    Execution history (audit trail, dedup, crash recovery)::

        toolkit = KeeperHubToolkit(history=True)           # ~/.keeperhub/executions.db
        toolkit = KeeperHubToolkit(history="./my.db")      # custom path
        # Adds keeperhub_list_executions tool automatically

    MCP bridge (adds KeeperHub's official 20 MCP workflow tools)::

        toolkit = KeeperHubToolkit(workflows=True)
        tools = await toolkit.aget_tools()   # must use async!

    Select specific tools::

        toolkit = KeeperHubToolkit(tools=["list_workflows", "execute_workflow", "execution_status"])
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://app.keeperhub.com",
        timeout: float = 30.0,
        tools: Sequence[ToolKey] | None = None,
        agent_context: dict[str, str] | None = None,
        # Safety guardrails
        testnet_only: bool = False,
        allowed_chain_ids: set[str] | None = None,
        # Execution history
        history: bool | str | Any = False,
        # MCP bridge
        workflows: bool = False,
        mcp_include: set[str] | None = None,
        mcp_exclude: set[str] | None = None,
    ) -> None:
        self._client = KeeperHubClient(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            agent_context=agent_context,
        )
        self._base_url = base_url
        self._enabled: set[ToolKey] = set(tools) if tools else set(ALL_TOOLS)
        self._testnet_only = testnet_only
        self._allowed_chain_ids = frozenset(allowed_chain_ids) if allowed_chain_ids else None
        self._workflows = workflows
        self._mcp_include = mcp_include
        self._mcp_exclude = mcp_exclude

        # Set up execution store
        self._store: Any = None
        if history is not False:
            from langchain_keeperhub.store import SqliteExecutionStore
            if history is True:
                self._store = SqliteExecutionStore()
            elif isinstance(history, str):
                self._store = SqliteExecutionStore(history)
            else:
                # Accept any object implementing ExecutionStore protocol
                self._store = history
            # Auto-enable list_executions when history is on
            self._enabled.add("list_executions")

    def get_tools(self) -> list[BaseTool]:
        """
        Return the list of enabled LangChain tools.

        Raises RuntimeError if workflows=True — use await toolkit.aget_tools() instead.
        """
        if self._workflows:
            raise RuntimeError(
                "This toolkit has workflows=True which requires async MCP loading. "
                "Use: tools = await toolkit.aget_tools()"
            )
        return self._build_native_tools()

    async def aget_tools(self) -> list[BaseTool]:
        """
        Async variant — required when workflows=True.
        Returns native tools + KeeperHub MCP tools combined.
        """
        native = self._build_native_tools()
        if not self._workflows:
            return native

        from langchain_keeperhub.mcp_bridge import load_mcp_tools
        api_key = self._client._client.headers.get("Authorization", "").removeprefix("Bearer ")
        mcp = await load_mcp_tools(
            api_key=api_key,
            base_url=self._base_url,
            include=self._mcp_include,
            exclude=self._mcp_exclude,
        )
        return native + mcp

    def _build_native_tools(self) -> list[BaseTool]:
        """Build and return all enabled native tools, applying testnet guard where needed."""
        store = self._store
        all_tools: list[tuple[ToolKey, BaseTool]] = [
            # Chain & contract
            ("list_chains",        ListChainsTool(client=self._client)),
            ("fetch_abi",          FetchContractABITool(client=self._client)),
            # Web3 execution
            ("transfer",           TransferFundsTool(client=self._client)),
            ("contract_call",      ContractCallTool(client=self._client)),
            ("check_and_execute",  CheckAndExecuteTool(client=self._client)),
            ("estimate_gas",       EstimateGasTool(client=self._client)),
            # Workflows
            ("list_workflows",     ListWorkflowsTool(client=self._client)),
            ("execute_workflow",   ExecuteWorkflowTool(client=self._client)),
            ("generate_workflow",  GenerateWorkflowTool(client=self._client)),
            ("execution_status",   GetExecutionStatusTool(client=self._client, store=store)),
            ("list_executions",    ListExecutionsTool(store=store) if store else None),
            # DeFi protocols
            ("list_protocols",     ListProtocolsTool(client=self._client)),
            ("protocol_action",    ProtocolActionTool(client=self._client)),
            # Payments (x402 / MPP)
            ("pay_and_run",        PayAndRunTool(client=self._client)),
            # Agent identity & wallet
            ("register_agent",     RegisterAgentTool(client=self._client)),
            ("wallet_balance",     WalletBalanceTool(client=self._client)),
            ("provision_wallet",   ProvisionWalletTool(client=self._client)),
            # Notifications
            ("notify",             NotifyTool(client=self._client)),
            ("list_integrations",  ListIntegrationsTool(client=self._client)),
            # Chainlink
            ("chainlink_ccip",     ChainlinkCcipTool(client=self._client)),
            ("chainlink_price",    ChainlinkPriceFeedTool(client=self._client)),
            # Ajna
            ("ajna",               AjnaTool(client=self._client)),
            # Utility plugins
            ("run_code",           CodeExecuteTool(client=self._client)),
            ("math_aggregate",     MathAggregateTool(client=self._client)),
            # Action schema discovery
            ("get_action_schema",  GetActionSchemaTool(client=self._client)),
            ("search_actions",     SearchActionsTool(client=self._client)),
            # Workflow versioning & migration
            ("workflow_version",   WorkflowVersionTool(client=self._client)),
            ("workflow_migrate",   WorkflowMigrateTool(client=self._client)),
            ("workflow_publish",   PublishWorkflowTool(client=self._client)),
            # ENS
            ("ens_resolve",        EnsResolveTool(client=self._client)),
            ("ens_text_record",    EnsTextRecordTool(client=self._client)),
            ("ens_lookup",         EnsLookupTool(client=self._client)),
        ]

        result: list[BaseTool] = []
        for key, tool in all_tools:
            if tool is None:
                continue
            if key not in self._enabled:
                continue
            # Apply testnet/chain guard on write tools
            if (self._testnet_only or self._allowed_chain_ids) and key in _WRITE_TOOL_KEYS:
                guard = _TestnetGuardTool(
                    name=tool.name,
                    description=tool.description,
                    inner=tool,
                    testnet_ids=_TESTNET_CHAIN_IDS,
                    allowed_ids=self._allowed_chain_ids,
                )
                result.append(guard)
            else:
                result.append(tool)

        return result

    async def build_system_prompt(self, include_workflows: bool = True) -> str:
        """
        Generate a system prompt fragment describing KeeperHub capabilities.

        Injects a live list of the org's workflows (sanitized against prompt injection)
        when include_workflows=True. Falls back gracefully if the API is unavailable.
        """
        lines = [
            "You have access to KeeperHub — an onchain workflow automation platform.",
            "You can execute blockchain transactions, DeFi operations, and token transfers.",
            "",
            "Available tools:",
            "- keeperhub_list_chains: Discover supported blockchain networks",
            "- keeperhub_fetch_contract_abi: Get verified ABI for any contract (auto-detects proxies)",
            "- keeperhub_transfer_funds: Send ETH or ERC-20 tokens",
            "- keeperhub_contract_call: Read or write any smart contract function",
            "- keeperhub_check_and_execute: Atomic condition check + transaction (no race conditions)",
            "- keeperhub_estimate_gas: Estimate gas cost before submitting a tx",
            "- keeperhub_list_workflows: Discover available automation workflows",
            "- keeperhub_execute_workflow: Run an existing workflow by ID",
            "- keeperhub_generate_workflow: Create a new workflow from a plain-English description",
            "- keeperhub_get_execution_status: Poll execution status and get tx hash",
            "- keeperhub_list_protocols: Browse 396 DeFi protocol actions",
            "- keeperhub_protocol_action: Execute any Aave/Uniswap/Lido/Compound action",
            "- keeperhub_ens_resolve: Resolve ENS name to address (e.g. vitalik.eth)",
            "",
            "Agent reasoning guide:",
            "1. For onchain actions: check keeperhub_list_workflows first — reuse before generating",
            "2. For new automations: keeperhub_generate_workflow → keeperhub_execute_workflow",
            "3. For write calls: use execution_id from the response + keeperhub_get_execution_status",
            "4. If ok=false and is_retryable=true: retry once after a short wait, then give up",
            "5. Always surface the summary field to the user — it is written for human consumption",
        ]

        if include_workflows:
            try:
                workflows = await self._client.get("/api/workflows")
                if workflows:
                    from langchain_keeperhub.tools.workflows import _sanitize
                    lines.append("")
                    lines.append(f"Available workflows ({len(workflows)}):")
                    for wf in workflows[:10]:
                        name = _sanitize(wf.get("name", ""))
                        wf_id = wf.get("id", "")
                        desc = _sanitize(wf.get("description", "")) if wf.get("description") else ""
                        lines.append(f"- {name} [{wf_id}]{': ' + desc if desc else ''}")
            except Exception:
                pass  # graceful degradation

        return "\n".join(lines)

    @property
    def client(self) -> KeeperHubClient:
        """Direct access to the underlying HTTP client."""
        return self._client

    @property
    def store(self) -> Any:
        """Direct access to the execution store (None if history=False)."""
        return self._store

    async def aclose(self) -> None:
        await self._client.aclose()
        if self._store:
            await self._store.aclose()

    async def __aenter__(self) -> "KeeperHubToolkit":
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()
