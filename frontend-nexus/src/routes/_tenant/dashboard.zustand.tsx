import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_tenant/dashboard/zustand')({
  component: ZustandExamplePage,
})

function ZustandExamplePage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Zustand Example</h1>
      <p className="mt-4 text-muted-foreground">
        Global state management – placeholder for implementation.
      </p>
    </div>
  )
}
