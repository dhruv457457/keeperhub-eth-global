"""
Live API test -- verifies our 10 tools actually work against KeeperHub.
Run: python test_live.py
"""
import asyncio
import json
import os
import sys

# Fix Windows terminal encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Set credentials inline for quick testing (use .env in production)
os.environ.setdefault("KEEPERHUB_API_KEY", "kh_NggwOag7aZD25r_VOSJn7GyvJtTTaqRd")

from langchain_keeperhub import KeeperHubToolkit
from langchain_keeperhub.client import KeeperHubClient


async def test_all():
    client = KeeperHubClient(api_key=os.environ["KEEPERHUB_API_KEY"])
    toolkit = KeeperHubToolkit(api_key=os.environ["KEEPERHUB_API_KEY"])
    tools = {t.name: t for t in toolkit.get_tools()}

    print(f"✅ Loaded {len(tools)} tools: {list(tools.keys())}\n")

    # ── 1. List Chains ────────────────────────────────────────────────────────
    print("📡 Testing keeperhub_list_chains...")
    result = await tools["keeperhub_list_chains"]._arun()
    chains = json.loads(result)
    if isinstance(chains, list):
        print(f"  ✅ Got {len(chains)} chains. First: {chains[0]['name']} (chainId={chains[0]['chainId']})")
    else:
        print(f"  ❌ Error: {chains}")

    print()

    # ── 2. List Workflows ─────────────────────────────────────────────────────
    print("📋 Testing keeperhub_list_workflows...")
    result = await tools["keeperhub_list_workflows"]._arun()
    workflows = json.loads(result)
    if isinstance(workflows, list):
        print(f"  ✅ Got {len(workflows)} workflows.")
        for wf in workflows[:3]:
            print(f"     - {wf['name']} [{wf['id']}]")
    else:
        print(f"  ❌ Error: {workflows}")

    print()

    # ── 3. Fetch ABI (USDC on Ethereum) ──────────────────────────────────────
    print("📄 Testing keeperhub_fetch_contract_abi (USDC on Ethereum)...")
    result = await tools["keeperhub_fetch_contract_abi"]._arun(
        chain_id=1,
        contract_address="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    )
    abi_data = json.loads(result)
    if abi_data.get("ok"):
        abi = abi_data.get("abi", [])
        print(f"  ✅ Got ABI with {len(abi)} entries.")
    else:
        print(f"  ❌ Error: {abi_data}")

    print()

    # ── 4. Read contract (USDC totalSupply) ───────────────────────────────────
    print("📖 Testing keeperhub_contract_call READ (USDC totalSupply)...")
    result = await tools["keeperhub_contract_call"]._arun(
        network="1",
        contract="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        function="totalSupply",
        call_type="read"
    )
    read_data = json.loads(result)
    if read_data.get("ok"):
        print(f"  ✅ USDC totalSupply = {read_data['result']}")
    else:
        print(f"  ❌ Error: {read_data}")

    print()

    # ── 5. Estimate Gas ───────────────────────────────────────────────────────
    # Use a function that exists in the proxy ABI (not implementation)
    print("⛽ Testing keeperhub_estimate_gas (USDC proxy changeAdmin)...")
    result = await tools["keeperhub_estimate_gas"]._arun(
        network="1",
        contract="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        function="changeAdmin"
    )
    gas_data = json.loads(result)
    if gas_data.get("ok"):
        print(f"  ✅ Estimated gas: {gas_data.get('estimated_gas')} units")
        print(f"     ETH cost: {gas_data.get('estimated_eth')}")
        print(f"     USD cost: ${gas_data.get('estimated_usd')}")
    else:
        print(f"  ❌ Error: {gas_data}")

    print()

    # ── 6. System prompt ──────────────────────────────────────────────────────
    print("🧠 Testing build_system_prompt...")
    prompt = await toolkit.build_system_prompt(include_workflows=True)
    lines = prompt.split("\n")
    print(f"  ✅ Got {len(lines)}-line system prompt.")
    print(f"  Preview: {lines[0]}")

    print()
    print("=" * 60)
    print("🎉 Live API test complete!")
    await client.aclose()


if __name__ == "__main__":
    asyncio.run(test_all())
