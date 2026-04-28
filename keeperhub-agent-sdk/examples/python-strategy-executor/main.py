from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "packages" / "langchain-keeperhub"))

from langchain_keeperhub.tools.agent import WalletBalanceTool  # noqa: E402
from langchain_keeperhub.tools.protocols import (  # noqa: E402
    ListProtocolsTool,
    ProtocolActionTool,
)
from langchain_keeperhub.tools.web3 import EstimateGasTool  # noqa: E402
from langchain_keeperhub.toolkit import KeeperHubToolkit  # noqa: E402


async def run_strategy(strategy: str) -> dict:
    toolkit = KeeperHubToolkit(
        api_key=os.environ.get("KEEPERHUB_API_KEY"),
        base_url=os.environ.get("KEEPERHUB_BASE_URL", "https://app.keeperhub.com"),
        tools=[
            "wallet_balance",
            "list_protocols",
            "protocol_action",
            "estimate_gas",
        ],
    )
    client = toolkit.client

    wallet_tool = WalletBalanceTool(client=client)
    protocols_tool = ListProtocolsTool(client=client)
    protocol_action_tool = ProtocolActionTool(client=client)
    gas_tool = EstimateGasTool(client=client)

    wallet = json.loads(await wallet_tool._arun())
    wallet_address = wallet.get("wallet_address") or os.environ.get(
        "KEEPERHUB_WALLET",
        "0x0000000000000000000000000000000000000000",
    )

    if strategy == "yield-scout":
        protocols = json.loads(await protocols_tool._arun(query="yield"))
        balance_check = json.loads(
            await protocol_action_tool._arun(
                action_type="web3/check-balance",
                params={"network": "11155111", "address": wallet_address},
            )
        )
        return {
            "strategy": strategy,
            "summary": "Python agent scanned available yield actions and checked Sepolia balance.",
            "steps": [
                "Loaded wallet balance via keeperhub_wallet_balance",
                "Queried KeeperHub action catalog for yield-oriented protocols",
                "Executed a protocol action through keeperhub_protocol_action",
            ],
            "wallet": wallet,
            "protocols": protocols,
            "balance_check": balance_check,
            "command": "python examples/python-strategy-executor/main.py yield-scout",
        }

    if strategy == "gas-check":
        estimate = json.loads(
            await gas_tool._arun(
                network="1",
                contract="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                function="approve",
                args=[wallet_address, "1000000"],
            )
        )
        return {
            "strategy": strategy,
            "summary": "Python agent prepared a gas estimate for a mainnet USDC approval.",
            "steps": [
                "Loaded wallet readiness via keeperhub_wallet_balance",
                "Estimated gas for a write-style contract call before execution",
            ],
            "wallet": wallet,
            "estimate": estimate,
            "command": "python examples/python-strategy-executor/main.py gas-check",
        }

    protocols = json.loads(await protocols_tool._arun(protocol="aave-v3"))
    return {
        "strategy": "wallet-readiness",
        "summary": "Python agent verified wallet readiness and discovered Aave-facing protocol actions.",
        "steps": [
            "Loaded managed wallet balances",
            "Checked Base and Tempo payment readiness",
            "Discovered protocol actions through KeeperHub's Python toolkit",
        ],
        "wallet": wallet,
        "protocols": protocols,
        "command": "python examples/python-strategy-executor/main.py wallet-readiness",
    }


if __name__ == "__main__":
    selected = sys.argv[1] if len(sys.argv) > 1 else "wallet-readiness"
    print(json.dumps(asyncio.run(run_strategy(selected))))
