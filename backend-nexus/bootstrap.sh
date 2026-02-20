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
    cat "$MIGRATION_LOG"
    if grep -q "Can't locate revision identified by" "$MIGRATION_LOG"; then
        echo "Detected stale Alembic revision in database. Stamping current head..."
        alembic stamp --purge head
    else
        echo "Migration failed with a non-recoverable error."
        rm -f "$MIGRATION_LOG"
        exit 1
    fi
fi
rm -f "$MIGRATION_LOG"

echo "Starting FastAPI..."
uvicorn app.main:app --host 0.0.0.0 --port 8000