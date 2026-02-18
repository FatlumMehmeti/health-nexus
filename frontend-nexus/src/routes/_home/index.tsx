import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_home/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Health Nexus</h1>
        <p className="mt-2 text-muted-foreground">
          Frontend setup with Vite, React, TanStack Router
        </p>
      </div>
    </div>
  )
}
