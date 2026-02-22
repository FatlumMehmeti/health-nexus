import sys
import os

from dotenv import load_dotenv

sys.path.append(os.getcwd())

# Load env: prefer .env.local, else .env (backend-nexus)
_backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_local = os.path.join(_backend_root, ".env.local")
_env_file = os.path.join(_backend_root, ".env")
if os.path.isfile(_env_local):
    load_dotenv(_env_local)
else:
    load_dotenv(_env_file)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

from sqlalchemy import engine_from_config, pool
from alembic import context

from app.models import Base

config = context.config
config.set_main_option("sqlalchemy.url", DATABASE_URL)

target_metadata = Base.metadata


def run_migrations_offline():
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()