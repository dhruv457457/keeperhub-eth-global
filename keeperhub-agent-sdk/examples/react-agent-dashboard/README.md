# React Agent Dashboard

## What it does

The main React hooks example. It turns a user goal into a KeeperHub execution
pipeline, applies payment guardrails, tracks execution progress, and renders a
receipt-style result.

## KeeperHub features used

- `keeperhub-sdk/react`
- `useWallet`
- `useWalletBalances`
- `useChains`
- `useExecutionStatus`
- `useExecutionLogs`
- `useAnalyticsSummary`
- `kh.pipeline().generate(...)`
- `pipeline.pay(...)`
- `pipeline.retry(...)`

## How to run

Run the showcase app and open:

`http://localhost:3100/examples/react-agent-dashboard`
