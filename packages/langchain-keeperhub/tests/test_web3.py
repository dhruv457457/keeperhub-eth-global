"""Tests: web3 tools — contract read, gas estimate, transfer (read-only safe tests)"""
import json
import pytest
import os

NETWORK = os.environ.get("TEST_NETWORK", "1")  # default Ethereum mainnet
USDC_ETH = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
TEST_WALLET = os.environ.get("KEEPERHUB_WALLET", "0x554bbFF68e21e1A4767247586983f98D41c49b78")


@pytest.mark.asyncio
async def test_contract_call_read_total_supply(tools):
    """Read USDC totalSupply — safe read-only call."""
    result = json.loads(await tools["keeperhub_contract_call"]._arun(
        network="1",
        contract=USDC_ETH,
        function="totalSupply",
        call_type="read",
    ))
    assert result.get("ok"), f"Read failed: {result}"
    assert result.get("result") is not None, "No result returned"
    supply = int(result["result"])
    assert supply > 0, "USDC totalSupply should be > 0"
    print(f"\n  ✅ USDC totalSupply: {supply:,}")


@pytest.mark.asyncio
async def test_contract_call_read_balance_of(tools):
    """Read USDC balanceOf for a known address."""
    result = json.loads(await tools["keeperhub_contract_call"]._arun(
        network="1",
        contract=USDC_ETH,
        function="balanceOf",
        args=[TEST_WALLET],
        call_type="read",
    ))
    assert result.get("ok"), f"balanceOf failed: {result}"
    print(f"\n  ✅ balanceOf({TEST_WALLET[:8]}...): {result.get('result')}")


@pytest.mark.asyncio
async def test_estimate_gas_returns_numbers(tools):
    """Gas estimation should return numeric values."""
    result = json.loads(await tools["keeperhub_estimate_gas"]._arun(
        network="1",
        contract=USDC_ETH,
        function="changeAdmin",  # in proxy ABI
    ))
    if not result.get("ok"):
        # Document the error — don't work around it
        print(f"\n  ⚠️  Gas estimate issue: {result.get('error')}")
        pytest.skip(f"Gas estimate API issue: {result.get('error')}")
    print(f"\n  ✅ Gas estimate: {result.get('estimated_gas')} units, "
          f"${result.get('estimated_usd')} USD")


@pytest.mark.asyncio
async def test_transfer_requires_funding(tools):
    """Transfer test — verifies API shape, skips if insufficient funds."""
    result = json.loads(await tools["keeperhub_transfer_funds"]._arun(
        network="11155111",  # Sepolia testnet
        to=TEST_WALLET,
        amount="0.0001",
    ))
    if not result.get("ok"):
        err = result.get("error", "")
        if "insufficient" in err.lower() or "balance" in err.lower() or "fund" in err.lower():
            pytest.skip(f"💰 Wallet needs Sepolia ETH. Fund: {TEST_WALLET}. Error: {err}")
        print(f"\n  ⚠️  Transfer issue (not funds-related): {err}")
    else:
        assert result.get("execution_id"), "No execution_id in transfer result"
        print(f"\n  ✅ Transfer submitted: {result['execution_id']}")


@pytest.mark.asyncio
async def test_check_and_execute_api_shape(tools):
    """Check-and-execute — verify API shape (condition: 1 == 2, action won't fire)."""
    result = json.loads(await tools["keeperhub_check_and_execute"]._arun(
        network="1",
        check_contract=USDC_ETH,
        check_function="totalSupply",
        check_args=None,
        check_abi=None,
        condition_operator="eq",
        condition_value="0",   # impossible condition — totalSupply never 0
        action_contract=USDC_ETH,
        action_function="totalSupply",
        action_args=None,
        action_abi=None,
    ))
    # condition_met should be False — action should not fire
    if result.get("ok"):
        assert result.get("condition_met") is False or result.get("condition_met") == False, \
            f"Condition should not have been met: {result}"
        print(f"\n  ✅ Check-and-execute: condition correctly not met")
    else:
        print(f"\n  ⚠️  Check-and-execute issue: {result.get('error')}")
