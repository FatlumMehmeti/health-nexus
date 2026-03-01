import os

from dotenv import load_dotenv

# Project root (same folder as alembic.ini / .env)
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Local file storage root (for uploads); swap for Azure later
_DEFAULT_STORAGE_ROOT = os.path.join(_project_root, "uploads")
_env_local = os.path.join(_project_root, ".env.local")
_env = os.path.join(_project_root, ".env")
# Prefer .env.local for local dev so repo .env can stay generic while each dev overrides with .env.local (often gitignored).
dotenv_path = _env_local if os.path.isfile(_env_local) else _env
load_dotenv(dotenv_path=dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required (e.g. postgresql+psycopg://user:pass@db:5432/name)")


def get_storage_root() -> str:
    """Root directory for file storage (local disk). Override with STORAGE_ROOT env."""
    return os.getenv("STORAGE_ROOT") or _DEFAULT_STORAGE_ROOT


def get_api_base_url() -> str:
    """Base URL for API (e.g. http://localhost:8000). Used for full URLs in responses."""
    return os.getenv("API_BASE_URL", "http://localhost:8000").rstrip("/")
