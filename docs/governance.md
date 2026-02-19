# Governance: Branching & PR Policy

## Branch naming

Use:

- `feature/FUL-<issue-number>-<short-description>` (new feature)
- `fix/FUL-<issue-number>-<short-description>` (bugfix)
- `chore/FUL-<issue-number>-<short-description>` (maintenance)
- `docs/FUL-<issue-number>-<short-description>` (documentation)

Examples:

- `feature/FUL-11-frontend-auth-guards`
- `fix/FUL-12-user-authentication`
- `chore/FUL-13-update-dependencies`
- `docs/FUL-14-api-documentation`

## PR rules

- All work must be merged via Pull Request (no direct pushes to `main`)
- CI must pass before merge (backend + frontend jobs)
- At least 1 approval required (team lead)
- PR description must include:
  - what changed
  - how to test
  - linked issue (e.g., FUL-13)

## Merge strategy

- Prefer **Squash and merge** to keep main history clean
- Delete branch after merge

## Definition of done for PRs

- CI green ✅
- Review approved ✅
- Issue linked ✅

## Project Structure

### Backend

- `backend-nexus/app`: Contains the FastAPI application code.

### Frontend

- `frontend-nexus/src`: Contains the React application code and components.

## Development Guidelines

- Follow the CI/CD process outlined in the CI configuration.
- Ensure to run tests and linting before submitting a PR.

## CI/CD Process

- The CI is configured to run tests and linting for both backend and frontend. Ensure the necessary environment variables are set for the backend tests.

## Task Management

### FUL Tasks

- **FUL13**: CI/CD Implementation
  - Sub-issues:
    - **FUL18**: [Short description of FUL18]
    - **FUL19**: [Short description of FUL19]

### Guidelines

- Ensure all sub-issues are linked to the main task for tracking.
- Follow the CI/CD process outlined in the CI configuration for FUL tasks.
