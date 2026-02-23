import os

from dotenv import load_dotenv

# Project root (same folder as alembic.ini / .env)
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_local = os.path.join(_project_root, ".env.local")
_env = os.path.join(_project_root, ".env")
# Prefer .env.local for local dev so repo .env can stay generic while each dev overrides with .env.local (often gitignored).
dotenv_path = _env_local if os.path.isfile(_env_local) else _env
load_dotenv(dotenv_path=dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")
