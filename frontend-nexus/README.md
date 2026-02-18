# Frontend Nexus

Health Nexus frontend – Vite, React, TanStack Router.

## Tech stack

Vite, React, TypeScript, TanStack Router, TanStack Query, Zustand, shadcn/ui, Tailwind CSS, React Hook Form, Zod, Inter (font)

## Development

```bash
npm install
npm run dev
```

## Project structure

- **Layouts**
  - **/** – redirects to /dashboard
  - **Tenant** (`/dashboard`) – sidebar + header
- **`src/components/`** – shared UI (ui, atoms, molecules)
- **`src/routes/<route>/-components/`** – route-specific components
- **`public/`** – static assets (images, icons, files)
  - `images/` – photos, graphics
  - `icons/` – favicons, SVGs
  - `files/` – PDFs, documents

## Font

Inter is loaded via `@fontsource/inter` (400, 600, 700) and applied globally.

## Commit convention

`feat(ful-54): <description>`
