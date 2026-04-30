"""MCP bridge — connect to KeeperHub's official MCP server for workflow tools."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from langchain_core.tools import BaseTool

logger = logging.getLogger("langchain_keeperhub.mcp_bridge")

# KeeperHub MCP server URL
_MCP_PATH = "/mcp"

# These native tool names collide with MCP tool names — MCP versions get prefixed
_COLLIDING_NAMES = {
    "get_execution_status",
    "list_workflows",
    "execute_workflow",
}


async def load_mcp_tools(
    api_key: str,
    base_url: str,
    include: set[str] | None = None,
    exclude: set[str] | None = None,
) -> list[BaseTool]:
    """
    Load KeeperHub MCP tools via langchain-mcp-adapters.

    Install with: pip install "langchain-keeperhub[workflows]"

    Args:
        api_key: KeeperHub API key (kh_ prefix)
        base_url: KeeperHub base URL (default: https://app.keeperhub.com)
        include: Server-side tool names to include (without keeperhub_ prefix).
                 If None, includes all tools except excluded ones.
        exclude: Server-side tool names to exclude. Defaults to {"tools_documentation"}
                 which burns tokens without helping the agent.

    Returns:
        List of LangChain BaseTool objects, each prefixed with keeperhub_workflow_
        (or keeperhub_ for non-colliding names).

    Raises:
        ImportError: If langchain-mcp-adapters is not installed.
        RuntimeError: If MCP server connection fails.
    """
    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient  # type: ignore[import]
    except ImportError:
        raise ImportError(
            "MCP bridge requires langchain-mcp-adapters. "
            "Install with: pip install 'langchain-keeperhub[workflows]'"
        )

    # Default excludes — meta-tool that confuses agents and burns tokens
    if exclude is None:
        exclude = {"tools_documentation"}

    mcp_url = base_url.rstrip("/") + _MCP_PATH

    try:
        client = MultiServerMCPClient({
            "keeperhub": {
                "url": mcp_url,
                "transport": "streamable_http",
                "headers": {"Authorization": f"Bearer {api_key}"},
            }
        })
        raw_tools: list[BaseTool] = await client.get_tools()
    except Exception as e:
        raise RuntimeError(f"Failed to connect to KeeperHub MCP server at {mcp_url}: {e}") from e

    result: list[BaseTool] = []
    for tool in raw_tools:
        # Strip any existing keeperhub_ prefix from server-side name
        server_name = tool.name.removeprefix("keeperhub_").replace("-", "_")

        # Apply include/exclude filters
        if include is not None and server_name not in include:
            continue
        if server_name in (exclude or set()):
            continue

        # Resolve final tool name:
        # - Colliding names get keeperhub_workflow_ prefix
        # - Others get keeperhub_ prefix
        if server_name in _COLLIDING_NAMES:
            new_name = f"keeperhub_workflow_{server_name}"
            logger.info(
                "MCP tool '%s' renamed to '%s' to avoid collision with native tool.",
                server_name, new_name
            )
        else:
            new_name = f"keeperhub_{server_name}"

        tool.name = new_name
        result.append(tool)

    logger.info("Loaded %d MCP tools from KeeperHub (filtered from %d).", len(result), len(raw_tools))
    return result
