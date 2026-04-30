"""langchain-keeperhub — LangChain toolkit for KeeperHub onchain automation."""

from langchain_keeperhub.client import KeeperHubClient
from langchain_keeperhub.toolkit import KeeperHubToolkit
from langchain_keeperhub.store import ExecutionRecord, SqliteExecutionStore
from langchain_keeperhub.tools import (
    # Chain & contract
    ListChainsTool,
    FetchContractABITool,
    # Web3 execution
    TransferFundsTool,
    ContractCallTool,
    CheckAndExecuteTool,
    EstimateGasTool,
    # Workflows
    ListWorkflowsTool,
    ExecuteWorkflowTool,
    GenerateWorkflowTool,
    GetExecutionStatusTool,
    ListExecutionsTool,
    # DeFi protocols
    ListProtocolsTool,
    ProtocolActionTool,
    # Payments
    PayAndRunTool,
    # Agent identity & wallet
    RegisterAgentTool,
    WalletBalanceTool,
    ProvisionWalletTool,
    # Notifications
    NotifyTool,
    ListIntegrationsTool,
    # Chainlink
    ChainlinkCcipTool,
    ChainlinkPriceFeedTool,
    # Ajna
    AjnaTool,
    # Utility plugins
    CodeExecuteTool,
    MathAggregateTool,
    # Action schema discovery
    GetActionSchemaTool,
    SearchActionsTool,
    # Workflow versioning & migration
    WorkflowVersionTool,
    WorkflowMigrateTool,
    PublishWorkflowTool,
    # ENS
    EnsResolveTool,
    EnsTextRecordTool,
    EnsLookupTool,
)

__version__ = "0.1.0"

__all__ = [
    # Toolkit (recommended entry point)
    "KeeperHubToolkit",
    # HTTP client (advanced use)
    "KeeperHubClient",
    # Execution store
    "ExecutionRecord",
    "SqliteExecutionStore",
    # Chain & contract
    "ListChainsTool",
    "FetchContractABITool",
    # Web3 execution
    "TransferFundsTool",
    "ContractCallTool",
    "CheckAndExecuteTool",
    "EstimateGasTool",
    # Workflows
    "ListWorkflowsTool",
    "ExecuteWorkflowTool",
    "GenerateWorkflowTool",
    "GetExecutionStatusTool",
    "ListExecutionsTool",
    # DeFi protocols
    "ListProtocolsTool",
    "ProtocolActionTool",
    # Payments
    "PayAndRunTool",
    # Agent identity & wallet
    "RegisterAgentTool",
    "WalletBalanceTool",
    "ProvisionWalletTool",
    # Notifications
    "NotifyTool",
    "ListIntegrationsTool",
    # Chainlink
    "ChainlinkCcipTool",
    "ChainlinkPriceFeedTool",
    # Ajna
    "AjnaTool",
    # Utility plugins
    "CodeExecuteTool",
    "MathAggregateTool",
    # Action schema discovery
    "GetActionSchemaTool",
    "SearchActionsTool",
    # Workflow versioning & migration
    "WorkflowVersionTool",
    "WorkflowMigrateTool",
    "PublishWorkflowTool",
    # ENS
    "EnsResolveTool",
    "EnsTextRecordTool",
    "EnsLookupTool",
]
