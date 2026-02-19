#!/usr/bin/env sh
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
alembic upgrade head
echo "Starting FastAPI..."
uvicorn app.main:app --host 0.0.0.0 --port 8000
