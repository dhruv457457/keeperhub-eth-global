# keeperhub_ens_text_record

Read a text record stored under an ENS name.

## What It Does
Fetches a specific key-value text record associated with an ENS name. ENS text records are on-chain metadata fields that owners can set to publish contact information, social profiles, and other identity data. Commonly used to retrieve email addresses, social handles, or website URLs linked to a wallet identity.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | str | yes | ENS name to query, e.g. `"vitalik.eth"` |
| key | str | yes | Text record key to fetch. Standard keys: `"email"`, `"url"`, `"twitter"`, `"github"`, `"avatar"`, `"description"` |

## Python Example
```python
result = await tool._arun(name="vitalik.eth", key="twitter")
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What is the Twitter handle for vitalik.eth?" }]
});
```

## Example Output
```json
{
  "name": "vitalik.eth",
  "key": "twitter",
  "value": "VitalikButerin"
}
```

## Notes
- Returns `"value": null` if the text record key is not set for that name.
- Standard keys defined by EIP-634: `"email"`, `"url"`, `"avatar"`, `"description"`, `"notice"`, `"keywords"`, `"twitter"`, `"github"`.
- Custom keys are also supported — any string can be used as a key if the owner has set it.
- Use `keeperhub_ens_resolve` first if you only have an address and need the ENS name.
