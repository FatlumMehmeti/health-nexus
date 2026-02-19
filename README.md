# Health Nexus

This is the initial commit, used as a base for the project setup.

## Project structure

- **frontend-nexus/** - Vite + React frontend (TanStack, Zustand, shadcn, Tailwind)
- **backend-nexus/** - FastAPI + SQLAlchemy + Alembic backend

## Tech stack

**Frontend:** Vite, React, TypeScript, TanStack, Zustand, shadcn/ui, Tailwind CSS, React Hook Form, Zod  
**Backend:** FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, Docker Compose

## Backend bootstrap

1. Ensure `.env` has `DATABASE_URL` and Postgres credentials.
2. Start services:
   `docker compose up --build`

On startup, the backend now:
- waits for Postgres,
- runs `alembic upgrade head`,
- auto-recovers stale DB revision pointers (for errors like `Can't locate revision identified by ...`) by stamping the current head.

## Clean reset (recommended when sharing with teammates)

If someone has old local Postgres volume data with mismatched migration history, run:

`docker compose down -v`
`docker compose up --build`

## For future schema changes:

You run alembic revision --autogenerate -m "..." locally.
Commit the new file in alembic/versions.