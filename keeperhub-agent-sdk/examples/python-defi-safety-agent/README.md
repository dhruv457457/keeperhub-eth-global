# Python DeFi Safety Agent

This example uses the Python LangChain toolkit to run safe KeeperHub checks and
surface a payment-gated workflow challenge.

## Run

From the repo root, install the local Python package first:

```bash
cd packages/langchain-keeperhub
python -m pip install -e ".[dev]"
```

Then run the example:

```bash
cd ../../keeperhub-agent-sdk/examples/python-defi-safety-agent
KEEPERHUB_API_KEY=kh_... python main.py
```

Expected behavior:

- Lists supported chains.
- Reads wallet state.
- Resolves ENS.
- Calls listed slug `microtip` and reports the MPP/x402 challenge.
