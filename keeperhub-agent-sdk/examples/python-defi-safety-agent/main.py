import asyncio
import json
import os

from langchain_keeperhub import KeeperHubToolkit


async def run() -> None:
    if not os.environ.get("KEEPERHUB_API_KEY"):
        raise RuntimeError("Set KEEPERHUB_API_KEY before running this demo.")

    toolkit = KeeperHubToolkit(
        tools=[
            "list_chains",
            "fetch_abi",
            "contract_call",
            "wallet_balance",
            "pay_and_run",
            "execution_status",
            "ens_resolve",
        ]
    )

    tools = {tool.name: tool for tool in toolkit.get_tools()}

    checks = {
        "chains": await tools["keeperhub_list_chains"]._arun(),
        "wallet": await tools["keeperhub_wallet_balance"]._arun(),
        "ens": await tools["keeperhub_ens_resolve"]._arun(name="vitalik.eth"),
        "x402_mpp": await tools["keeperhub_pay_and_run"]._arun(
            listed_slug="microtip",
            max_budget_usd="0.01",
            prefer_mpp=True,
        ),
    }

    print(json.dumps(checks, indent=2))


if __name__ == "__main__":
    asyncio.run(run())
