# Component structure

**Shared** (used across routes):

- **ui/** – shadcn components (`npx shadcn add <component>`)
- **atoms/** – smallest reusable building blocks (e.g. Icon, Label)
- **molecules/** – compositions of atoms (e.g. FormField, CardHeader)

**Layouts**

- **/** – redirects to /dashboard
- **/dashboard** – sidebar + header

**Route-specific** – colocated as `-components/` (the `-` prefix excludes from TanStack Router)
