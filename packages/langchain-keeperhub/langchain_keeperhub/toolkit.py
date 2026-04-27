"""KeeperHub LangChain Toolkit — bundles all tools for agent use."""

from __future__ import annotations

import os
from typing import Literal, Sequence

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
)

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
)


class KeeperHubToolkit:
    """
    KeeperHub LangChain Toolkit.

    Bundles 10 tools covering web3 operations, workflow management,
    and AI workflow generation for use with any LangChain / LangGraph agent.

    Quick start::

        from langchain_keeperhub import KeeperHubToolkit
        from langgraph.prebuilt import create_react_agent

        toolkit = KeeperHubToolkit()  # reads KEEPERHUB_API_KEY from env
        agent = create_react_agent(llm, tools=toolkit.get_tools())

    Select specific tools::

        toolkit = KeeperHubToolkit(tools=["list_workflows", "execute_workflow", "execution_status"])

    Add session context for observability::

        toolkit = KeeperHubToolkit(
            agent_context={
                "session_id": conversation_id,
                "goal": "Manage DeFi portfolio for user",
            }
        )
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://app.keeperhub.com",
        timeout: float = 30.0,
        tools: Sequence[ToolKey] | None = None,
        agent_context: dict[str, str] | None = None,
    ) -> None:
        self._client = KeeperHubClient(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            agent_context=agent_context,
        )
        self._enabled: set[ToolKey] = set(tools) if tools else set(ALL_TOOLS)

    def get_tools(self) -> list[BaseTool]:
        """Return the list of enabled LangChain tools."""
        all_tools: list[tuple[ToolKey, BaseTool]] = [
            # Chain & contract
            ("list_chains",      ListChainsTool(client=self._client)),
            ("fetch_abi",        FetchContractABITool(client=self._client)),
            # Web3 execution
            ("transfer",         TransferFundsTool(client=self._client)),
            ("contract_call",    ContractCallTool(client=self._client)),
            ("check_and_execute", CheckAndExecuteTool(client=self._client)),
            ("estimate_gas",     EstimateGasTool(client=self._client)),
            # Workflows
            ("list_workflows",   ListWorkflowsTool(client=self._client)),
            ("execute_workflow", ExecuteWorkflowTool(client=self._client)),
            ("generate_workflow", GenerateWorkflowTool(client=self._client)),
            ("execution_status", GetExecutionStatusTool(client=self._client)),
            # DeFi protocols
            ("list_protocols",   ListProtocolsTool(client=self._client)),
            ("protocol_action",  ProtocolActionTool(client=self._client)),
            # Payments (x402 / MPP)
            ("pay_and_run",      PayAndRunTool(client=self._client)),
            # Agent identity & wallet
            ("register_agent",   RegisterAgentTool(client=self._client)),
            ("wallet_balance",   WalletBalanceTool(client=self._client)),
            ("provision_wallet", ProvisionWalletTool(client=self._client)),
            # Notifications
            ("notify",           NotifyTool(client=self._client)),
            ("list_integrations", ListIntegrationsTool(client=self._client)),
            # Chainlink
            ("chainlink_ccip",   ChainlinkCcipTool(client=self._client)),
            ("chainlink_price",  ChainlinkPriceFeedTool(client=self._client)),
            # Ajna
            ("ajna",             AjnaTool(client=self._client)),
            # Utility plugins
            ("run_code",         CodeExecuteTool(client=self._client)),
            ("math_aggregate",   MathAggregateTool(client=self._client)),
            # Action schema discovery
            ("get_action_schema", GetActionSchemaTool(client=self._client)),
            ("search_actions",    SearchActionsTool(client=self._client)),
            # Workflow versioning & migration
            ("workflow_version",  WorkflowVersionTool(client=self._client)),
            ("workflow_migrate",  WorkflowMigrateTool(client=self._client)),
            ("workflow_publish",  PublishWorkflowTool(client=self._client)),
        ]
        return [tool for key, tool in all_tools if key in self._enabled]

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

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "KeeperHubToolkit":
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()
