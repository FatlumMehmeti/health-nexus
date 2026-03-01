#!/usr/bin/env sh
set -eu

echo "Waiting for database..."
python << END
import socket
import time
host = "db"
port = 5432
while True:
    try:
        s = socket.create_connection((host, port), 2)
        s.close()
        break
    except OSError:
        time.sleep(1)
END

echo "Running migrations..."
MIGRATION_LOG="$(mktemp)"
if alembic upgrade head >"$MIGRATION_LOG" 2>&1; then
    cat "$MIGRATION_LOG"
else
    echo "Migration failed."
    cat "$MIGRATION_LOG"
    rm -f "$MIGRATION_LOG"
    echo "Fix (dev): docker compose down -v && docker compose up --build"
    exit 1
fi
rm -f "$MIGRATION_LOG"

SEED_ON_BOOT="${SEED_ON_BOOT:-true}"
if [ "$SEED_ON_BOOT" = "true" ]; then
    echo "Seeding baseline data..."
    python -m app.seed
fi

VERIFY_SEED_ON_BOOT="${VERIFY_SEED_ON_BOOT:-true}"
if [ "$VERIFY_SEED_ON_BOOT" = "true" ]; then
    echo "Verifying migration + seed baseline..."
    python -m app.verify_seed
fi

echo "Starting FastAPI..."
# Use --reload in dev so backend restarts on code changes (no container restart needed)
if [ "${UVICORN_RELOAD:-false}" = "true" ]; then
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000
fi
