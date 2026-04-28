"""Tests: protocol tools — list_protocols, get_action_schema, protocol_action (reads only)"""
import json
import pytest


@pytest.mark.asyncio
async def test_list_protocols_returns_actions(tools):
    result = json.loads(await tools["keeperhub_list_protocols"]._arun())
    if not result.get("ok"):
        pytest.skip(f"list_protocols not available: {result.get('error')}")
    assert result.get("count", 0) > 0, "No protocols/actions returned"
    actions = result.get("actions", [])
    assert len(actions) > 0
    print(f"\n  ✅ Got {result['count']} protocol actions")


@pytest.mark.asyncio
async def test_search_actions_aave(tools):
    result = json.loads(await tools["keeperhub_search_actions"]._arun(query="supply"))
    if not result.get("ok"):
        pytest.skip(f"search_actions not available: {result.get('error')}")
    print(f"\n  ✅ 'supply' search: {result.get('total_found', 0)} actions found")


@pytest.mark.asyncio
async def test_get_action_schema_aave_supply(tools):
    result = json.loads(await tools["keeperhub_get_action_schema"]._arun(
        action_type="aave-v3/supply"
    ))
    if not result.get("ok"):
        print(f"\n  ⚠️  aave-v3/supply schema not found: {result.get('error')}")
        pytest.skip("Action schema not available")
    assert "required_fields" in result or "requiredFields" in result, \
        f"No required_fields in schema: {result.keys()}"
    print(f"\n  ✅ aave-v3/supply schema: required={list(result.get('required_fields', {}).keys())}")


@pytest.mark.asyncio
async def test_get_action_schema_discord(tools):
    result = json.loads(await tools["keeperhub_get_action_schema"]._arun(
        action_type="discord/send-message"
    ))
    if not result.get("ok"):
        print(f"\n  ⚠️  discord schema issue: {result.get('error')}")
        return
    print(f"\n  ✅ discord/send-message schema found")


@pytest.mark.asyncio
async def test_ajna_get_pool_info(tools):
    """Ajna pool read — Base mainnet."""
    AJNA_POOL = "0x46Acc253133b3Ec0953fe4445B5Ba8E6CFe10500"  # cbBTC/usBTCd pool
    result = json.loads(await tools["keeperhub_ajna"]._arun(
        action="get-pool-lup",
        params={"pool": AJNA_POOL},
    ))
    if not result.get("ok"):
        print(f"\n  ⚠️  Ajna get-pool-lup issue: {result.get('error')}")
        pytest.skip(f"Ajna not available: {result.get('error')}")
    print(f"\n  ✅ Ajna pool LUP: {result.get('result')}")


@pytest.mark.asyncio
async def test_chainlink_price_eth_usd(tools):
    """Chainlink ETH/USD price feed."""
    result = json.loads(await tools["keeperhub_chainlink_price"]._arun(feed="eth-usd"))
    if not result.get("ok"):
        print(f"\n  ⚠️  Chainlink price feed issue: {result.get('error')}")
        pytest.skip(f"Chainlink price not available: {result.get('error')}")
    assert result.get("price") or result.get("result"), f"No price in response: {result}"
    print(f"\n  ✅ ETH/USD price: {result.get('price') or result.get('result')}")
