import os
from pathlib import Path

import pytest
from dotenv import load_dotenv
from sqlalchemy import text

from app.models.base import Base
from app.db import engine, SessionLocal

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


# Import so all models register their tables with Base.metadata before drop/create.
import app.models  # noqa: F401


@pytest.fixture(scope="function", autouse=True)
def reset_database():
    """
    Reset PostgreSQL database using CASCADE schema drop.
    Guarantees test isolation.
    """

    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))

    # Recreate tables
    Base.metadata.create_all(bind=engine)

    yield

    engine.dispose()


@pytest.fixture(scope="function")
def db_session():
    """
    Provide a DB session for the test; session is closed after the test.
    Use this fixture when a test needs database access.
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="session")
def require_database_url():
    """Assert DATABASE_URL is set; message indicates which env file was loaded."""
    url = os.environ.get("DATABASE_URL")
    assert url, (
        "DATABASE_URL must be set for tests (loaded from backend-nexus/%s)"
        % _env_loaded
    )
    return url
