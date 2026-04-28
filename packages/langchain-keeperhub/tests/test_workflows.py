"""Tests: workflow tools — list, execute, generate, status, version, schema"""
import json
import pytest
import os


@pytest.mark.asyncio
async def test_list_workflows(tools):
    result = json.loads(await tools["keeperhub_list_workflows"]._arun())
    assert isinstance(result, list), f"Expected list: {result}"
    print(f"\n  ✅ Got {len(result)} workflows")
    if result:
        print(f"     First: {result[0].get('name')} [{result[0].get('id')}]")


@pytest.mark.asyncio
async def test_list_workflows_names_sanitized(tools):
    """Workflow names should not contain injection chars."""
    result = json.loads(await tools["keeperhub_list_workflows"]._arun())
    for wf in result:
        name = wf.get("name", "")
        assert "`" not in name, f"Backtick in workflow name: {name}"
        assert "{" not in name, f"Brace in workflow name: {name}"


@pytest.mark.asyncio
async def test_get_execution_status_invalid_id(tools):
    """Unknown execution ID should return generic 'not found' — not leak 404."""
    result = json.loads(await tools["keeperhub_get_execution_status"]._arun(
        execution_id="exec_doesnotexist99999"
    ))
    assert "error" in result
    error = result["error"].lower()
    # Must NOT expose raw 404 — security requirement
    assert "404" not in error, f"Raw 404 exposed in error: {result['error']}"
    print(f"\n  ✅ Generic error returned (no 404 leak): {result['error']}")


@pytest.mark.asyncio
async def test_generate_workflow_creates_id(tools):
    """Generate a workflow and verify we get a workflow ID back."""
    result = json.loads(await tools["keeperhub_generate_workflow"]._arun(
        prompt="Check ETH balance of 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Ethereum",
        execute=False,
    ))
    if not result.get("ok"):
        pytest.skip(f"Workflow generation not available: {result.get('error')}")
    assert result.get("workflow_id"), f"No workflow_id in response: {result}"
    print(f"\n  ✅ Generated workflow: {result['workflow_id']}")


@pytest.mark.asyncio
async def test_workflow_version(tools):
    """Duplicate a workflow to create v2."""
    # First get a real workflow ID
    wf_list = json.loads(await tools["keeperhub_list_workflows"]._arun())
    if not wf_list:
        pytest.skip("No workflows to version")

    wf_id = wf_list[0]["id"]
    result = json.loads(await tools["keeperhub_workflow_version"]._arun(
        workflow_id=wf_id,
        go_live=False,
    ))
    if not result.get("ok"):
        pytest.skip(f"Workflow version not available: {result.get('error')}")
    assert result.get("new_workflow_id"), f"No new_workflow_id: {result}"
    assert result["new_workflow_id"] != wf_id, "New ID should differ from original"
    print(f"\n  ✅ Versioned: {wf_id} → {result['new_workflow_id']}")
