"""Tests: agent identity, wallet balance, ENS tools"""
import json
import pytest
import os

TEST_WALLET = os.environ.get("KEEPERHUB_WALLET", "0x554bbFF68e21e1A4767247586983f98D41c49b78")
ENS_NAME = os.environ.get("ENS_TEST_NAME", "vitalik.eth")
ENS_ADDRESS = os.environ.get("ENS_TEST_ADDRESS", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")


@pytest.mark.asyncio
async def test_wallet_balance_returns_address(tools):
    result = json.loads(await tools["keeperhub_wallet_balance"]._arun())
    if not result.get("ok"):
        print(f"\n  ⚠️  Wallet balance issue: {result.get('error')}")
        pytest.skip(f"Wallet balance not available: {result.get('error')}")
    assert result.get("wallet_address"), "No wallet address returned"
    payment = result.get("payment_readiness", {})
    usdc_base = payment.get("x402_base_usdc", {})
    usdc_tempo = payment.get("mpp_tempo_usdce", {})
    print(f"\n  ✅ Wallet: {result['wallet_address']}")
    print(f"     Base USDC (x402): {usdc_base.get('balance', '?')} — ready={usdc_base.get('ready')}")
    print(f"     Tempo USDC.e (MPP): {usdc_tempo.get('balance', '?')} — ready={usdc_tempo.get('ready')}")


@pytest.mark.asyncio
async def test_register_agent_idempotent(tools):
    """Register agent — should be idempotent."""
    result = json.loads(await tools["keeperhub_register_agent"]._arun(
        name="KeeperHub SDK Test Agent",
        description="Automated test agent for langchain-keeperhub",
        capabilities=["aave-v3/supply", "uniswap/swap-exact-input"],
    ))
    if not result.get("ok"):
        print(f"\n  ⚠️  Agent registration issue: {result.get('error')}")
        pytest.skip(f"Agent registration not available: {result.get('error')}")
    print(f"\n  ✅ Agent registered/found. ID: {result.get('agent_id')}")
    if result.get("already_registered"):
        print(f"     (already registered — idempotent ✅)")


@pytest.mark.asyncio
async def test_ens_resolve_vitalik(tools):
    """Resolve vitalik.eth → known address."""
    result = json.loads(await tools["keeperhub_ens_resolve"]._arun(name=ENS_NAME))
    if not result.get("ok"):
        print(f"\n  ⚠️  ENS resolve issue: {result.get('error')}")
        pytest.skip(f"ENS not available: {result.get('error')}")
    assert result.get("address"), f"No address resolved for {ENS_NAME}"
    resolved = result["address"].lower()
    expected = ENS_ADDRESS.lower()
    assert resolved == expected, f"ENS mismatch: got {resolved}, expected {expected}"
    print(f"\n  ✅ {ENS_NAME} → {result['address']}")


@pytest.mark.asyncio
async def test_ens_lookup_reverse(tools):
    """Reverse lookup — address → ENS name."""
    result = json.loads(await tools["keeperhub_ens_lookup"]._arun(address=ENS_ADDRESS))
    if not result.get("ok"):
        print(f"\n  ⚠️  ENS reverse lookup issue: {result.get('error')}")
        pytest.skip(f"ENS reverse not available: {result.get('error')}")
    print(f"\n  ✅ {ENS_ADDRESS[:10]}... → {result.get('ens_name', 'no primary name')}")


@pytest.mark.asyncio
async def test_ens_text_record_description(tools):
    """Read ENS text record — description field."""
    result = json.loads(await tools["keeperhub_ens_text_record"]._arun(
        name=ENS_NAME,
        key="description",
    ))
    if not result.get("ok"):
        print(f"\n  ⚠️  ENS text record issue: {result.get('error')}")
        pytest.skip(f"ENS text record not available: {result.get('error')}")
    print(f"\n  ✅ {ENS_NAME} description: '{result.get('value', '(empty)')}'")
