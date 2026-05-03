# keeperhub_contract_call

Read from or write to any smart contract on any supported chain.

## What It Does

Provides a generic interface for interacting with any EVM smart contract. For `read` calls, returns the decoded return value without spending gas. For `write` calls, submits a transaction from the KeeperHub managed wallet and returns the transaction hash.

## Schema

```
network: str             — Chain name (e.g. "base", "ethereum") or chain ID as string.
contract_address: str    — 0x address of the target contract.
function_name: str       — ABI function name (e.g. "balanceOf", "transfer", "latestRoundData").
function_args?: str      — JSON array of arguments matching the function signature. Default: "[]".
call_type: str           — "read" for view/pure calls, "write" for state-changing calls.
value?: str              — ETH value to send with the call (write only), in decimal ETH. Default: "0".
```

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_contract_call")

async def main():
    # Read: check ERC-20 balance
    result = await tool._arun(
        network="base",
        contract_address="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC
        function_name="balanceOf",
        function_args='["0xYourWalletAddress..."]',
        call_type="read"
    )
    print(result)

    # Read: Chainlink ETH/USD price on Base
    result = await tool._arun(
        network="base",
        contract_address="0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
        function_name="latestRoundData",
        call_type="read"
    )
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const callTool = tools.find(t => t.name === "keeperhub_contract_call")!;

// Read ERC-20 total supply
const result = await callTool.invoke({
  network: "base",
  contract_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  function_name: "totalSupply",
  function_args: "[]",
  call_type: "read",
});
console.log(result);
```

## Example Output (read)

```json
{
  "result": "1000000000",
  "decoded": "1000000000",
  "network": "base",
  "contract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "function": "balanceOf"
}
```

## Example Output (write)

```json
{
  "txHash": "0x9e8f7d6c...5b4a",
  "network": "base",
  "status": "submitted",
  "explorerUrl": "https://basescan.org/tx/0x9e8f7d6c...5b4a"
}
```

## Notes

- `function_args` must be a valid JSON array string. For addresses, wrap in quotes: `'["0xAbc..."]'`. For integers, use numbers: `'[1000000]'`.
- The ABI is resolved automatically from Etherscan/Sourcify — no need to supply it manually for verified contracts.
- For unverified contracts, complex tuple arguments may not decode correctly.
- `write` calls use the KeeperHub managed wallet and consume gas. Check ETH balance first with `keeperhub_wallet_balance`.
- `value` is only meaningful for payable functions.
