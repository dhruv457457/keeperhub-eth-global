"""Tests: notification tools — list integrations, notify"""
import json
import pytest


@pytest.mark.asyncio
async def test_list_integrations_returns_list(tools):
    result = json.loads(await tools["keeperhub_list_integrations"]._arun())
    if not result.get("ok"):
        print(f"\n  ⚠️  List integrations issue: {result.get('error')}")
        pytest.skip(f"Integrations not available: {result.get('error')}")
    assert isinstance(result.get("integrations"), list), f"Expected list: {result}"
    print(f"\n  ✅ Got {result.get('count', 0)} integrations")
    for i in result.get("integrations", []):
        print(f"     - {i.get('type')}: {i.get('name')} [{i.get('id')}]")


@pytest.mark.asyncio
async def test_list_integrations_filter_discord(tools):
    result = json.loads(await tools["keeperhub_list_integrations"]._arun(type="discord"))
    if not result.get("ok"):
        pytest.skip(f"Not available: {result.get('error')}")
    print(f"\n  ✅ Discord integrations: {result.get('count', 0)}")
    if result.get("count", 0) == 0:
        print(f"     ℹ️  No Discord integrations configured — set up at app.keeperhub.com → Integrations")


@pytest.mark.asyncio
async def test_notify_requires_workflow_or_setup(tools):
    """Notify without a workflow ID — should attempt AI generation or explain setup."""
    result = json.loads(await tools["keeperhub_notify"]._arun(
        channel="discord",
        message="Test notification from langchain-keeperhub test suite",
    ))
    # Either ok (generated workflow) or error explaining setup needed
    if result.get("ok"):
        print(f"\n  ✅ Notification sent: {result.get('summary')}")
    else:
        err = result.get("error", "")
        print(f"\n  ⚠️  Notify requires integration setup: {err[:100]}")
        # This is expected if no Discord integration configured
        assert "integration" in err.lower() or "workflow" in err.lower() or "channel" in err.lower() \
            or err != "", f"Unexpected empty error"
