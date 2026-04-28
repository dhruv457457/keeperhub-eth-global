# Eliza Agent Operator

## What it does

An operator console for ElizaOS-backed autonomous actions. It verifies agent
identity, runs plugin actions, and reflects KeeperHub execution state back into
the UI.

## KeeperHub features used

- `@keeperhub/elizaos`
- `createKeeperHubPlugin(...)`
- `kh.agent.ensureRegistered(...)`
- plugin workflow discovery
- plugin protocol actions
- plugin transfer actions

## How to run

Run the showcase app and open:

`http://localhost:3100/examples/eliza-agent-operator`
