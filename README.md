# Health Nexus

This is the initial commit, used as a base for the project setup.

## Project structure

- **frontend-nexus/** - Vite + React frontend (TanStack, Zustand, shadcn, Tailwind)
- **backend-nexus/** - FastAPI + SQLAlchemy + Alembic backend

## Tech stack

**Frontend:** Vite, React, TypeScript, TanStack, Zustand, shadcn/ui, Tailwind CSS, React Hook Form, Zod  
**Backend:** FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, Docker Compose

## Backend bootstrap

1. Copy `.env.example` to `.env` and ensure `DATABASE_URL` uses `postgresql+psycopg://` (required for Python 3.13 support).
2. Start services:
   `docker compose up --build`

On startup, backend now:

- waits for Postgres,
- runs `alembic upgrade head`,
- seeds deterministic baseline data for PRD-01 and PRD-02 (`app.seed`),
- verifies migration + seed baseline (`app.verify_seed`).

You can control bootstrap behavior via env vars:

- `SEED_ON_BOOT=true|false` (default `true`)
- `VERIFY_SEED_ON_BOOT=true|false` (default `true`)

## Reproducible seed baseline

Seeded roles:

- `SUPER_ADMIN`
- `TENANT_MANAGER`
- `DOCTOR`
- `SALES`
- `CLIENT`

Seeded tenants:

- `Iliria Hospital`
- `Dardania Clinic`
- `American Hospital`
- `Polyclinic Diagnoze`

Seeded memberships:

- `Small Clinic` (`1500` / 30 days)
- `Medium Clinic` (`5000` / 30 days)
- `Hospital` (`10000` / 30 days)

## Migration + seed verification steps

- Full clean bootstrap:
  - `docker compose down -v`
  - `docker compose up --build`
- Verify startup logs include:
  - `Running migrations...`
  - `Seed completed.`
  - `Seed verification passed.`

## Clean reset (recommended when sharing with teammates)

If someone has old local Postgres volume data, run:

`docker compose down -v`
`docker compose up --build`

## Run migrations and seed separately

For manual control (e.g. after schema changes):

```bash
make db-up      # Start db only
make migrate-up # Run alembic upgrade head
make seed       # Seed baseline data
```

Full clean reset (wipe DB, migrate, seed):

```bash
make reset
```

## For future schema changes

1. Run `alembic revision --autogenerate -m "..."`
2. Review migration output
3. Commit new file in `backend-nexus/alembic/versions/`
