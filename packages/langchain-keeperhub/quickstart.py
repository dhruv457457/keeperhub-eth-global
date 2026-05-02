#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KeeperHub Python LangChain -- 5-minute quickstart

Setup (one time):
  pip install keeperhub-langchain langchain-openai langgraph

  export KEEPERHUB_API_KEY=kh_...      # app.keeperhub.com -> Settings -> API Keys
  export OPENROUTER_API_KEY=sk-or-...  # openrouter.ai -- free models available
  # OR: export OPENAI_API_KEY=sk-...

Run:
  python quickstart.py
"""

import asyncio
import os
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from langchain_keeperhub import KeeperHubToolkit
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent


# -- LLM config (OpenRouter supports 100+ models, free tier available) ----------
LLM_BASE_URL = "https://openrouter.ai/api/v1"
LLM_API_KEY  = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
LLM_MODEL    = "anthropic/claude-haiku-4-5"  # fast + cheap on OpenRouter


async def main():
    # 1. Load KeeperHub tools
    print("[1/3] Loading KeeperHub tools...")
    toolkit = KeeperHubToolkit(testnet_only=True)   # blocks mainnet writes in dev
    tools   = toolkit.get_tools()
    print(f"      {len(tools)} tools ready (DeFi, transfers, ENS, workflows...)\n")

    # 2. Connect LLM
    print(f"[2/3] Connecting LLM ({LLM_MODEL})...")
    llm   = ChatOpenAI(model=LLM_MODEL, base_url=LLM_BASE_URL, api_key=LLM_API_KEY)
    agent = create_react_agent(model=llm, tools=tools)
    print("      Agent ready\n")
    print("=" * 60)

    # 3. Run three real queries
    queries = [
        "What blockchains does KeeperHub support? List the mainnets.",
        "What is my KeeperHub wallet address?",
        "Resolve the ENS name vitalik.eth and tell me the address.",
    ]

    for q in queries:
        print(f"\n> {q}")
        result = await agent.ainvoke({"messages": [("user", q)]})
        print(result["messages"][-1].content)
        print("-" * 60)

    print("\n[DONE] Onchain agent working.")
    print("       Swap the queries above for anything:")
    print("       'Supply 100 USDC to Aave on Base'")
    print("       'What is the best USDC yield right now?'")
    print("       'Send 0.001 ETH to vitalik.eth on Sepolia'")


asyncio.run(main())
