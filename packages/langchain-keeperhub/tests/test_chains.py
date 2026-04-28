"""Tests: keeperhub_list_chains + keeperhub_fetch_contract_abi"""
import json
import pytest
import os

USDC_ETH = os.environ.get("USDC_ETH_ADDRESS", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")


@pytest.mark.asyncio
async def test_list_chains_returns_list(tools):
    result = json.loads(await tools["keeperhub_list_chains"]._arun())
    assert isinstance(result, list), f"Expected list, got: {result}"
    assert len(result) > 0, "No chains returned"
    print(f"\n  ✅ Got {len(result)} chains")


@pytest.mark.asyncio
async def test_list_chains_has_required_fields(tools):
    result = json.loads(await tools["keeperhub_list_chains"]._arun())
    first = result[0]
    assert "chainId" in first
    assert "name" in first
    assert "symbol" in first
    print(f"\n  ✅ First chain: {first['name']} (chainId={first['chainId']})")


@pytest.mark.asyncio
async def test_list_chains_includes_base(tools):
    result = json.loads(await tools["keeperhub_list_chains"]._arun())
    chain_ids = [c["chainId"] for c in result]
    assert 8453 in chain_ids, f"Base (8453) not found. Got: {chain_ids[:5]}"
    print(f"\n  ✅ Base (8453) found in supported chains")


@pytest.mark.asyncio
async def test_list_chains_includes_tempo(tools):
    """Tempo is KeeperHub's MPP payment chain — must be present."""
    result = json.loads(await tools["keeperhub_list_chains"]._arun())
    chain_ids = [c["chainId"] for c in result]
    assert 4217 in chain_ids, f"Tempo (4217) not found — MPP payments won't work. Got: {chain_ids}"
    print(f"\n  ✅ Tempo (4217) found — MPP payments supported")


@pytest.mark.asyncio
async def test_fetch_abi_usdc(tools):
    result = json.loads(await tools["keeperhub_fetch_contract_abi"]._arun(
        chain_id=1,
        contract_address=USDC_ETH,
    ))
    # API may return { ok, abi } or { success, abi }
    assert result.get("ok") or result.get("success") or "abi" in result, \
        f"ABI fetch failed: {result}"
    abi = result.get("abi", [])
    assert len(abi) > 0, "Empty ABI returned"
    print(f"\n  ✅ USDC ABI: {len(abi)} entries")


@pytest.mark.asyncio
async def test_fetch_abi_no_error_field(tools):
    result = json.loads(await tools["keeperhub_fetch_contract_abi"]._arun(
        chain_id=1,
        contract_address=USDC_ETH,
    ))
    assert "error" not in result, f"Unexpected error: {result.get('error')}"
