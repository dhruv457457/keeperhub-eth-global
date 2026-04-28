"""Basic unit tests for langchain-keeperhub tools (using mocked HTTP)."""

from __future__ import annotations

import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from langchain_keeperhub import KeeperHubToolkit
from langchain_keeperhub.client import KeeperHubClient
from langchain_keeperhub.tools import (
    EstimateGasTool,
    FetchContractABITool,
    GetExecutionStatusTool,
    ListChainsTool,
    ListWorkflowsTool,
    TransferFundsTool,
)


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_client() -> KeeperHubClient:
    client = MagicMock(spec=KeeperHubClient)
    client.get = AsyncMock()
    client.post = AsyncMock()
    return client


# ─── Toolkit ────────────────────────────────────────────────────────────────

def test_toolkit_returns_all_tools_by_default():
    toolkit = KeeperHubToolkit(api_key="kh_test_key")
    tools = toolkit.get_tools()
    assert len(tools) == 31


def test_toolkit_selective_tools():
    toolkit = KeeperHubToolkit(
        api_key="kh_test_key",
        tools=["list_chains", "transfer", "execution_status"],
    )
    tools = toolkit.get_tools()
    assert len(tools) == 3
    names = {t.name for t in tools}
    assert "keeperhub_list_chains" in names
    assert "keeperhub_transfer_funds" in names
    assert "keeperhub_get_execution_status" in names


def test_toolkit_tool_names():
    toolkit = KeeperHubToolkit(api_key="kh_test_key")
    names = {t.name for t in toolkit.get_tools()}
    expected_subset = {
        "keeperhub_list_chains",
        "keeperhub_fetch_contract_abi",
        "keeperhub_transfer_funds",
        "keeperhub_contract_call",
        "keeperhub_check_and_execute",
        "keeperhub_estimate_gas",
        "keeperhub_list_workflows",
        "keeperhub_execute_workflow",
        "keeperhub_generate_workflow",
        "keeperhub_get_execution_status",
        "keeperhub_protocol_action",
        "keeperhub_get_action_schema",
        "keeperhub_search_actions",
        "keeperhub_ens_resolve",
    }
    assert expected_subset.issubset(names)
    assert len(names) == 31


# ─── ListChainsTool ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_chains_success(mock_client):
    mock_client.get.return_value = [
        {"chainId": 1, "name": "Ethereum", "symbol": "ETH", "isTestnet": False,
         "isEnabled": True, "explorerUrl": "https://etherscan.io"},
        {"chainId": 8453, "name": "Base", "symbol": "ETH", "isTestnet": False,
         "isEnabled": True, "explorerUrl": "https://basescan.org"},
    ]
    tool = ListChainsTool(client=mock_client)
    result = json.loads(await tool._arun())

    assert len(result) == 2
    assert result[0]["chainId"] == 1
    assert result[1]["chainId"] == 8453


@pytest.mark.asyncio
async def test_list_chains_filters_disabled(mock_client):
    mock_client.get.return_value = [
        {"chainId": 1, "name": "Ethereum", "symbol": "ETH", "isEnabled": True},
        {"chainId": 999, "name": "Defunct", "symbol": "DFT", "isEnabled": False},
    ]
    tool = ListChainsTool(client=mock_client)
    result = json.loads(await tool._arun())

    assert len(result) == 1
    assert result[0]["chainId"] == 1


@pytest.mark.asyncio
async def test_list_chains_error(mock_client):
    mock_client.get.side_effect = Exception("Network error")
    tool = ListChainsTool(client=mock_client)
    result = json.loads(await tool._arun())

    assert "error" in result


# ─── FetchContractABITool ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fetch_abi_success(mock_client):
    mock_abi = [{"type": "function", "name": "balanceOf", "inputs": [], "outputs": []}]
    mock_client.get.return_value = mock_abi
    tool = FetchContractABITool(client=mock_client)
    result = json.loads(await tool._arun(chain_id=1, contract_address="0xabc"))

    assert result["ok"] is True
    assert result["abi"][0]["name"] == "balanceOf"
    mock_client.get.assert_called_once_with("/api/chains/1/abi", address="0xabc")


# ─── TransferFundsTool ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_transfer_success(mock_client):
    mock_client.post.return_value = {"executionId": "exec_123", "status": "pending"}
    tool = TransferFundsTool(client=mock_client)
    result = json.loads(await tool._arun(
        network="8453", to="0xrecipient", amount="0.01"
    ))

    assert result["ok"] is True
    assert result["execution_id"] == "exec_123"
    assert "hint" in result


@pytest.mark.asyncio
async def test_transfer_with_token(mock_client):
    mock_client.post.return_value = {"executionId": "exec_456", "status": "pending"}
    tool = TransferFundsTool(client=mock_client)
    await tool._arun(
        network="8453",
        to="0xrecipient",
        amount="100",
        token="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    )
    call_body = mock_client.post.call_args[1]["json"]
    assert "tokenAddress" in call_body
    assert call_body["tokenAddress"] == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"


@pytest.mark.asyncio
async def test_transfer_error(mock_client):
    mock_client.post.side_effect = Exception("insufficient funds")
    tool = TransferFundsTool(client=mock_client)
    result = json.loads(await tool._arun(
        network="8453", to="0xrecipient", amount="999"
    ))
    assert result["ok"] is False
    assert "error" in result


# ─── ListWorkflowsTool ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_workflows_sanitizes_names(mock_client):
    """Workflow names with injection characters should be stripped."""
    mock_client.get.return_value = [
        {
            "id": "wf_abc",
            "name": "Legit Workflow `{rm -rf}` [injected]",
            "description": None,
        }
    ]
    tool = ListWorkflowsTool(client=mock_client)
    result = json.loads(await tool._arun())

    assert len(result) == 1
    name = result[0]["name"]
    assert "`" not in name
    assert "{" not in name
    assert "[" not in name


# ─── GetExecutionStatusTool ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_execution_status_not_found(mock_client):
    """Should return generic message for 404, not expose whether ID exists."""
    mock_client.get.side_effect = Exception("404 Not Found")
    tool = GetExecutionStatusTool(client=mock_client)
    result = json.loads(await tool._arun(execution_id="exec_nonexistent"))

    assert "error" in result
    assert "not found" in result["error"].lower() or "not accessible" in result["error"].lower()
    # Must NOT reveal "404" or specific error text
    assert "404" not in result["error"]


@pytest.mark.asyncio
async def test_execution_status_success(mock_client):
    mock_client.get.return_value = {
        "status": "completed",
        "progress": 100,
        "errorContext": None,
    }
    tool = GetExecutionStatusTool(client=mock_client)
    result = json.loads(await tool._arun(execution_id="exec_abc"))

    assert result["status"] == "completed"
    assert result["progress"] == 100
    assert result["error"] is None


# ─── EstimateGasTool ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_estimate_gas(mock_client):
    mock_client.post.return_value = {
        "estimatedGas": 85000,
        "estimatedEth": "0.0000034",
        "estimatedUsd": "0.0102",
        "gasPrice": "40000000000",
    }
    tool = EstimateGasTool(client=mock_client)
    result = json.loads(await tool._arun(
        network="1",
        contract="0xcontract",
        function="transfer",
        args=["0xrecipient", 1000000],
    ))

    assert result["ok"] is True
    assert result["estimated_gas"] == 85000
    assert result["estimated_usd"] == "0.0102"


# ─── System prompt ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_build_system_prompt_no_workflows():
    toolkit = KeeperHubToolkit(api_key="kh_test")
    prompt = await toolkit.build_system_prompt(include_workflows=False)

    assert "KeeperHub" in prompt
    assert "keeperhub_list_chains" in prompt
    assert "keeperhub_execute_workflow" in prompt
    assert "Agent reasoning guide" in prompt


@pytest.mark.asyncio
async def test_build_system_prompt_with_workflows():
    """Should gracefully handle API failure and return base prompt."""
    toolkit = KeeperHubToolkit(api_key="kh_test")
    # The client will fail (no real API key) — should return base prompt, not raise
    prompt = await toolkit.build_system_prompt(include_workflows=True)
    assert "KeeperHub" in prompt
    assert "keeperhub_list_chains" in prompt
