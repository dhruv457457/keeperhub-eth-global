"""Tests: KeeperHubToolkit — setup, tool loading, system prompt"""
import json
import pytest
import os
from langchain_keeperhub import KeeperHubToolkit

API_KEY = os.environ.get("KEEPERHUB_API_KEY", "")


def test_toolkit_loads_all_tools():
    toolkit = KeeperHubToolkit(api_key=API_KEY)
    tools = toolkit.get_tools()
    assert len(tools) >= 30, f"Expected 30+ tools, got {len(tools)}"
    print(f"\n  ✅ Loaded {len(tools)} tools")


def test_toolkit_tool_names_unique():
    toolkit = KeeperHubToolkit(api_key=API_KEY)
    names = [t.name for t in toolkit.get_tools()]
    assert len(names) == len(set(names)), f"Duplicate tool names: {[n for n in names if names.count(n) > 1]}"
    print(f"\n  ✅ All {len(names)} tool names are unique")


def test_toolkit_selective_tools():
    toolkit = KeeperHubToolkit(api_key=API_KEY, tools=["list_chains", "list_workflows", "ens_resolve"])
    tools = toolkit.get_tools()
    assert len(tools) == 3
    names = {t.name for t in tools}
    assert "keeperhub_list_chains" in names
    assert "keeperhub_list_workflows" in names
    assert "keeperhub_ens_resolve" in names
    print(f"\n  ✅ Selective tool loading works")


def test_all_tools_have_description():
    toolkit = KeeperHubToolkit(api_key=API_KEY)
    for tool in toolkit.get_tools():
        assert tool.description, f"Tool {tool.name} has no description"
        assert len(tool.description) > 20, f"Tool {tool.name} description too short"
    print(f"\n  ✅ All tools have descriptions")


def test_all_tools_have_schema():
    toolkit = KeeperHubToolkit(api_key=API_KEY)
    for tool in toolkit.get_tools():
        assert tool.args_schema is not None, f"Tool {tool.name} has no args_schema"
    print(f"\n  ✅ All tools have Pydantic schemas")


@pytest.mark.asyncio
async def test_build_system_prompt_no_workflows():
    toolkit = KeeperHubToolkit(api_key=API_KEY)
    prompt = await toolkit.build_system_prompt(include_workflows=False)
    assert "KeeperHub" in prompt
    assert "keeperhub_list_chains" in prompt
    assert len(prompt) > 200
    print(f"\n  ✅ System prompt ({len(prompt)} chars) generated without workflows")


@pytest.mark.asyncio
async def test_build_system_prompt_with_live_workflows():
    toolkit = KeeperHubToolkit(api_key=API_KEY)
    prompt = await toolkit.build_system_prompt(include_workflows=True)
    assert "KeeperHub" in prompt
    print(f"\n  ✅ System prompt with live workflows ({len(prompt)} chars)")
    if "Available workflows" in prompt:
        print(f"     ✅ Live workflow list injected")
    else:
        print(f"     ⚠️  No workflows injected (API may be unavailable)")


@pytest.mark.asyncio
async def test_context_manager():
    async with KeeperHubToolkit(api_key=API_KEY) as toolkit:
        tools = toolkit.get_tools()
        assert len(tools) > 0
    print(f"\n  ✅ Context manager works — client closed cleanly")
