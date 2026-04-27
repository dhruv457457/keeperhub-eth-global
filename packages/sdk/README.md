# keeperhub-sdk

TypeScript SDK for KeeperHub.

## Install

```bash
pnpm add keeperhub-sdk
```

## Setup

1. Get an API key:
   https://app.keeperhub.com/api-keys

2. Set an environment variable:

```bash
export KEEPERHUB_API_KEY=your_key
```

Or use the CLI helper:

```bash
npx keeperhub login
```

That saves your API key to `~/.keeperhub/config.json`, so Node environments can use:

```ts
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub();
```

You can also bootstrap a local project env file:

```bash
npx keeperhub init
```

This writes your API key to both `~/.keeperhub/config.json` and `.env`.

## Examples

```ts
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub();

const workflows = await kh.workflows.list();
console.log(workflows.length);
```

```ts
const result = await kh
  .pipeline()
  .workflow("wf_123")
  .execute()
  .retry({ attempts: 2, delayMs: 1000 })
  .wait();
```
