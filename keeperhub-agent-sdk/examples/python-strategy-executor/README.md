# Python Strategy Executor

## What it does

A real Python example using `langchain_keeperhub`. The frontend triggers the
script, captures structured JSON output, and pairs it with KeeperHub analytics
and trace tooling in the same product surface.

## KeeperHub features used

- `langchain_keeperhub.KeeperHubToolkit`
- `WalletBalanceTool`
- `ListProtocolsTool`
- `ProtocolActionTool`
- `EstimateGasTool`
- `kh.analytics.summary()`
- `kh.debug.trace()`

## How to run

Run the showcase app and open:

`http://localhost:3100/examples/python-strategy-executor`

To run the script directly:

```bash
python examples/python-strategy-executor/main.py wallet-readiness
```
