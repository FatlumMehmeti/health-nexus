import os

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required (e.g. postgresql+psycopg://user:pass@db:5432/name)")