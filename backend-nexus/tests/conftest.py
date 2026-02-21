import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

# backend-nexus root (parent of tests/)
_root = Path(__file__).resolve().parents[1]
_env_local = _root / ".env.local"
_env_default = _root / ".env"

if _env_local.exists():
    load_dotenv(_env_local, override=True)
    _env_loaded = ".env.local"
else:
    load_dotenv(_env_default, override=True)
    _env_loaded = ".env"


@pytest.fixture(scope="session")
def require_database_url():
    """Assert DATABASE_URL is set; message indicates which env file was loaded."""
    url = os.environ.get("DATABASE_URL")
    assert url, (
        "DATABASE_URL must be set for tests (loaded from backend-nexus/%s)"
        % _env_loaded
    )
    return url
