"""Shared test fixtures for langchain-keeperhub tests."""
import os
import sys
from pathlib import Path

# Load .env.test
env_file = Path(__file__).parent / ".env.test"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

import pytest
from langchain_keeperhub.client import KeeperHubClient
from langchain_keeperhub import KeeperHubToolkit

API_KEY = os.environ.get("KEEPERHUB_API_KEY", "")
BASE_URL = os.environ.get("KEEPERHUB_BASE_URL", "https://app.keeperhub.com")

@pytest.fixture
def client():
    return KeeperHubClient(api_key=API_KEY, base_url=BASE_URL)

@pytest.fixture
def toolkit():
    return KeeperHubToolkit(api_key=API_KEY, base_url=BASE_URL)

@pytest.fixture
def tools(toolkit):
    return {t.name: t for t in toolkit.get_tools()}
