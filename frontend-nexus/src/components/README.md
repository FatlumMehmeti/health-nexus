# Component structure

**Shared** (used across routes):

- **ui/** – shadcn components (`npx shadcn add <component>`)
- **atoms/** – smallest reusable building blocks (e.g. Icon, Label)
- **molecules/** – compositions of atoms (e.g. FormField, CardHeader)

**Route-specific** – colocated in each route folder as `-components/` (the `-` prefix excludes it from TanStack Router):

- `routes/_home/-components/`
- `routes/_about/-components/`
- `routes/_blog/-components/`
