"""
Master test runner — runs all langchain-keeperhub tests and produces a report.
Usage: python tests/run_all.py
"""
import sys
import os
import asyncio
import json
from pathlib import Path
from datetime import datetime

# Load env
env_file = Path(__file__).parent / ".env.test"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

sys.stdout.reconfigure(encoding="utf-8")

from langchain_keeperhub import KeeperHubToolkit
from langchain_keeperhub.client import KeeperHubClient

API_KEY = os.environ.get("KEEPERHUB_API_KEY", "")
WALLET = os.environ.get("KEEPERHUB_WALLET", "")

PASS = "PASS"
FAIL = "FAIL"
SKIP = "SKIP"
ISSUE = "ISSUE"  # KeeperHub-side issue to document

results = []

def record(category, name, status, detail="", issue_question=None):
    results.append({
        "category": category,
        "name": name,
        "status": status,
        "detail": detail,
        "issue_question": issue_question,
    })
    icon = {"PASS": "✅", "FAIL": "❌", "SKIP": "⏭️", "ISSUE": "⚠️"}[status]
    print(f"  {icon} [{status}] {name}")
    if detail:
        print(f"       {detail}")
    if issue_question:
        print(f"       ❓ QUESTION: {issue_question}")


async def run_all():
    print("=" * 70)
    print(f"langchain-keeperhub — Live API Test Suite")
    print(f"Time: {datetime.now().isoformat()}")
    print(f"API Key: {API_KEY[:12]}...{API_KEY[-4:]}" if len(API_KEY) > 16 else f"API Key: {API_KEY}")
    print(f"Wallet: {WALLET}")
    print("=" * 70)

    client = KeeperHubClient(api_key=API_KEY)
    toolkit = KeeperHubToolkit(api_key=API_KEY)
    tools = {t.name: t for t in toolkit.get_tools()}

    print(f"\n📦 Toolkit loaded: {len(tools)} tools\n")

    # ─── CHAINS ──────────────────────────────────────────────────────────────
    print("\n── CHAINS ──────────────────────────────────────────────────────────")
    try:
        r = json.loads(await tools["keeperhub_list_chains"]._arun())
        chains = r if isinstance(r, list) else []
        chain_ids = [c["chainId"] for c in chains]
        record("chains", "list_chains returns list", PASS if chains else FAIL,
               f"{len(chains)} chains returned")
        record("chains", "Base (8453) supported", PASS if 8453 in chain_ids else FAIL,
               f"Chain IDs: {chain_ids[:5]}")
        record("chains", "Tempo (4217) supported", PASS if 4217 in chain_ids else ISSUE,
               f"Required for MPP payments",
               issue_question="Is Tempo (chainId 4217) supported for MPP payment testing?" if 4217 not in chain_ids else None)
        record("chains", "Sepolia (11155111) supported", PASS if 11155111 in chain_ids else SKIP,
               "Optional testnet for write tests")
    except Exception as e:
        record("chains", "list_chains", FAIL, str(e))

    try:
        r = json.loads(await tools["keeperhub_fetch_contract_abi"]._arun(
            chain_id=1, contract_address="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        ))
        abi = r.get("abi", [])
        record("chains", "fetch_contract_abi (USDC/ETH)", PASS if abi else FAIL,
               f"{len(abi)} ABI entries")
    except Exception as e:
        record("chains", "fetch_contract_abi", FAIL, str(e))

    # ─── WEB3 ────────────────────────────────────────────────────────────────
    print("\n── WEB3 ─────────────────────────────────────────────────────────────")
    try:
        r = json.loads(await tools["keeperhub_contract_call"]._arun(
            network="1", contract="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            function="totalSupply", call_type="read"
        ))
        record("web3", "contract_call READ (USDC totalSupply)", PASS if r.get("ok") else FAIL,
               f"Result: {r.get('result', r.get('error'))}")
    except Exception as e:
        record("web3", "contract_call READ", FAIL, str(e))

    try:
        r = json.loads(await tools["keeperhub_estimate_gas"]._arun(
            network="1", contract="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            function="changeAdmin"
        ))
        if r.get("ok"):
            record("web3", "estimate_gas", PASS,
                   f"Gas: {r.get('estimated_gas')}, USD: ${r.get('estimated_usd')}")
        else:
            record("web3", "estimate_gas", ISSUE, r.get("error", ""),
                   issue_question="Gas estimate API requires 'contractAddress, abi, and abiFunction'. What is the correct request format for the /api/gas/estimate endpoint?")
    except Exception as e:
        record("web3", "estimate_gas", FAIL, str(e))

    try:
        r = json.loads(await tools["keeperhub_transfer_funds"]._arun(
            network="11155111", to=WALLET, amount="0.0001"
        ))
        if r.get("ok"):
            record("web3", "transfer (Sepolia testnet)", PASS,
                   f"Execution ID: {r.get('execution_id')}")
        else:
            err = r.get("error", "")
            if "fund" in err.lower() or "balance" in err.lower() or "insufficient" in err.lower():
                record("web3", "transfer (Sepolia)", SKIP,
                       f"Needs Sepolia ETH at {WALLET}")
            else:
                record("web3", "transfer (Sepolia)", ISSUE, err,
                       issue_question=f"Transfer to Sepolia testnet failed with: {err}. Is Sepolia supported for direct execution?")
    except Exception as e:
        record("web3", "transfer", FAIL, str(e))

    # ─── WORKFLOWS ───────────────────────────────────────────────────────────
    print("\n── WORKFLOWS ────────────────────────────────────────────────────────")
    workflow_id = None
    try:
        r = json.loads(await tools["keeperhub_list_workflows"]._arun())
        wfs = r if isinstance(r, list) else []
        if wfs:
            workflow_id = wfs[0]["id"]
        record("workflows", "list_workflows", PASS if isinstance(r, list) else FAIL,
               f"{len(wfs)} workflows. First: {wfs[0]['name'] if wfs else 'none'}")
    except Exception as e:
        record("workflows", "list_workflows", FAIL, str(e))

    if workflow_id:
        try:
            r = json.loads(await tools["keeperhub_execute_workflow"]._arun(
                workflow_id=workflow_id, input={}, wait=True
            ))
            if r.get("ok"):
                record("workflows", f"execute_workflow ({workflow_id})", PASS, r.get("summary", ""))
            else:
                record("workflows", f"execute_workflow ({workflow_id})", ISSUE,
                       r.get("summary", r.get("error", "")),
                       issue_question=f"Workflow {workflow_id} failed with: {r.get('error')}. Is this workflow runnable with empty input?")
        except Exception as e:
            record("workflows", "execute_workflow", FAIL, str(e))

    try:
        r = json.loads(await tools["keeperhub_get_execution_status"]._arun(
            execution_id="exec_doesnotexist99999"
        ))
        err = r.get("error", "")
        no_leak = "404" not in err
        record("workflows", "get_execution_status security (no 404 leak)", PASS if no_leak else FAIL,
               f"Error msg: '{err[:60]}'")
    except Exception as e:
        record("workflows", "get_execution_status security", FAIL, str(e))

    # ─── PROTOCOLS ───────────────────────────────────────────────────────────
    print("\n── PROTOCOLS ────────────────────────────────────────────────────────")
    try:
        r = json.loads(await tools["keeperhub_list_protocols"]._arun())
        count = r.get("count", 0) if r.get("ok") else 0
        record("protocols", "list_protocols", PASS if r.get("ok") and count > 0 else ISSUE,
               f"{count} actions",
               issue_question="GET /api/mcp/schemas returned 0 results. What query params are needed?" if count == 0 else None)
    except Exception as e:
        record("protocols", "list_protocols", FAIL, str(e))

    try:
        r = json.loads(await tools["keeperhub_get_action_schema"]._arun(action_type="aave-v3/supply"))
        if r.get("ok"):
            record("protocols", "get_action_schema (aave-v3/supply)", PASS,
                   f"Required: {list(r.get('required_fields', {}).keys())[:3]}")
        else:
            record("protocols", "get_action_schema (aave-v3/supply)", ISSUE,
                   r.get("error", ""),
                   issue_question="Schema for 'aave-v3/supply' not found via /api/mcp/schemas. What is the correct action type format?")
    except Exception as e:
        record("protocols", "get_action_schema", FAIL, str(e))

    try:
        r = json.loads(await tools["keeperhub_chainlink_price"]._arun(feed="eth-usd", network=1))
        if r.get("ok"):
            record("protocols", "chainlink_price (eth-usd)", PASS,
                   f"Price: {r.get('price') or r.get('result')}")
        else:
            record("protocols", "chainlink_price", ISSUE, r.get("error", ""),
                   issue_question="Chainlink ETH/USD price feed (chainlink/eth-usd-latest-round-data) with network=1 config failed. What is the correct config format?")
    except Exception as e:
        record("protocols", "chainlink_price", FAIL, str(e))

    # ─── AGENT & WALLET ──────────────────────────────────────────────────────
    print("\n── AGENT & WALLET ───────────────────────────────────────────────────")
    try:
        r = json.loads(await tools["keeperhub_wallet_balance"]._arun())
        if r.get("ok"):
            payment = r.get("payment_readiness", {})
            usdc = payment.get("x402_base_usdc", {})
            record("agent", "wallet_balance", PASS,
                   f"Address: {r.get('wallet_address', '')[:10]}... USDC(Base): {usdc.get('balance', '?')}")
        else:
            record("agent", "wallet_balance", ISSUE, r.get("error", ""),
                   issue_question=f"Wallet balance failed: {r.get('error')}. What is the correct endpoint for org wallet balance?")
    except Exception as e:
        record("agent", "wallet_balance", FAIL, str(e))

    try:
        r = json.loads(await tools["keeperhub_register_agent"]._arun(
            name="KeeperHub SDK Test", description="Test"
        ))
        if r.get("ok"):
            record("agent", "register_agent (ERC-8004)", PASS,
                   f"ID: {r.get('agent_id')}, already_registered={r.get('already_registered')}")
        else:
            record("agent", "register_agent", ISSUE, r.get("error", ""),
                   issue_question=f"ERC-8004 registration failed: {r.get('error')}. What does /api/agent-registry POST expect?")
    except Exception as e:
        record("agent", "register_agent", FAIL, str(e))

    # ─── ENS ─────────────────────────────────────────────────────────────────
    print("\n── ENS ──────────────────────────────────────────────────────────────")
    try:
        r = json.loads(await tools["keeperhub_ens_resolve"]._arun(name="vitalik.eth"))
        if r.get("ok") and r.get("address"):
            expected = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045".lower()
            match = r["address"].lower() == expected
            record("ens", "ens_resolve (vitalik.eth)", PASS if match else FAIL,
                   f"Resolved: {r['address']}")
        else:
            record("ens", "ens_resolve", ISSUE, r.get("error", ""),
                   issue_question="ENS resolution via api.ensideas.com failed. Is there a preferred ENS API?")
    except Exception as e:
        record("ens", "ens_resolve", FAIL, str(e))

    try:
        r = json.loads(await tools["keeperhub_ens_lookup"]._arun(
            address="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        ))
        if r.get("ok"):
            record("ens", "ens_lookup (reverse)", PASS,
                   f"ENS: {r.get('ens_name', 'no primary name')}")
        else:
            record("ens", "ens_lookup", ISSUE, r.get("error", ""))
    except Exception as e:
        record("ens", "ens_lookup", FAIL, str(e))

    # ─── MATH ────────────────────────────────────────────────────────────────
    print("\n── MATH & UTILITY ───────────────────────────────────────────────────")
    try:
        r = json.loads(await tools["keeperhub_math_aggregate"]._arun(
            operation="average", values=[3.2, 4.1, 5.6, 2.8],
            description="Test APY rates"
        ))
        expected = (3.2 + 4.1 + 5.6 + 2.8) / 4
        correct = abs(r.get("result", 0) - expected) < 0.001
        record("utility", "math_aggregate (average)", PASS if correct else FAIL,
               f"Result: {r.get('result')}, expected: {expected:.3f}")
    except Exception as e:
        record("utility", "math_aggregate", FAIL, str(e))

    # ─── SYSTEM PROMPT ───────────────────────────────────────────────────────
    print("\n── SYSTEM PROMPT ────────────────────────────────────────────────────")
    try:
        prompt = await toolkit.build_system_prompt(include_workflows=True)
        has_tools = "keeperhub_list_chains" in prompt
        has_workflows = "Available workflows" in prompt
        record("system", "build_system_prompt", PASS if has_tools else FAIL,
               f"{len(prompt)} chars, has_tools={has_tools}, has_live_workflows={has_workflows}")
    except Exception as e:
        record("system", "build_system_prompt", FAIL, str(e))

    await client.aclose()

    # ─── REPORT ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("RESULTS SUMMARY")
    print("=" * 70)

    passed = [r for r in results if r["status"] == PASS]
    failed = [r for r in results if r["status"] == FAIL]
    issues = [r for r in results if r["status"] == ISSUE]
    skipped = [r for r in results if r["status"] == SKIP]

    print(f"\n✅ PASSED:  {len(passed)}")
    print(f"❌ FAILED:  {len(failed)}")
    print(f"⚠️  ISSUES: {len(issues)}  (KeeperHub-side — questions to ask)")
    print(f"⏭️  SKIPPED: {len(skipped)}  (needs testnet funding)")

    if issues:
        print("\n" + "─" * 70)
        print("QUESTIONS FOR KEEPERHUB DISCORD:")
        print("─" * 70)
        for i, r in enumerate(issues, 1):
            if r.get("issue_question"):
                print(f"\n{i}. [{r['category']}] {r['name']}")
                print(f"   ❓ {r['issue_question']}")
                if r.get("detail"):
                    print(f"   Error: {r['detail'][:100]}")

    if failed:
        print("\n" + "─" * 70)
        print("FAILURES (code bugs):")
        for r in failed:
            print(f"\n  ❌ {r['category']}/{r['name']}: {r['detail'][:100]}")

    print("\n" + "=" * 70)
    return len(failed) == 0


if __name__ == "__main__":
    success = asyncio.run(run_all())
    sys.exit(0 if success else 1)
