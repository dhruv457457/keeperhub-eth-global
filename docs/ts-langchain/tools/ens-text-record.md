# keeperhub_ens_text_record

Read a text record stored under an ENS name.

## What It Does
Fetches a specific key-value text record from an ENS name's on-chain resolver. ENS text records let owners publish metadata such as email addresses, social handles, website URLs, and profile descriptions alongside their wallet address. Returns the string value for the requested key, or null if not set.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | yes | ENS name to query, e.g. `"vitalik.eth"` |
| key | string | yes | Text record key to fetch. Standard keys: `"email"`, `"url"`, `"twitter"`, `"github"`, `"avatar"`, `"description"` |

## Python Example
```python
result = await tool._arun(name="vitalik.eth", key="github")
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What GitHub username does vitalik.eth have?" }]
});
```

## Example Output
```json
{
  "name": "vitalik.eth",
  "key": "github",
  "value": "vbuterin"
}
```

## Notes
- Returns `"value": null` if the text record key is not set for that name.
- Standard EIP-634 keys: `"email"`, `"url"`, `"avatar"`, `"description"`, `"notice"`, `"keywords"`, `"twitter"`, `"github"`.
- Custom keys beyond the standard set are also supported if set by the ENS name owner.
- Use `keeperhub_ens_resolve` to get the address if you only have the ENS name.
