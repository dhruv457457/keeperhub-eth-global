# MCP Integration

KeeperHub exposes an MCP (Model Context Protocol) server that any MCP-compatible agent can connect to.

## Connection

```
URL:       https://app.keeperhub.com/mcp
Transport: streamable_http
Auth:      Bearer $KEEPERHUB_API_KEY
```

## Use in SKILL.md (Hermes / agentskills.io)

```yaml
metadata:
  hermes:
    mcp:
      server: https://app.keeperhub.com/mcp
      transport: streamable_http
      auth: bearer
      envVar: KEEPERHUB_API_KEY
```

## Use in Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "keeperhub": {
      "url": "https://app.keeperhub.com/mcp",
      "transport": "streamable_http",
      "headers": {
        "Authorization": "Bearer kh_your_key_here"
      }
    }
  }
}
```

## Use with LangChain MCP Adapters (Python)

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "keeperhub": {
        "url": "https://app.keeperhub.com/mcp",
        "transport": "streamable_http",
        "headers": {"Authorization": f"Bearer {api_key}"},
    }
})
tools = await client.get_tools()
```

## Notes

- The MCP server exposes KeeperHub's own tool set — separate from our SDK tools
- Our SDK tools (25 LangChain tools, 17 ElizaOS actions) are a superset with additional capabilities like token address resolution, Chainlink price feeds, and ERC-8004 registration
