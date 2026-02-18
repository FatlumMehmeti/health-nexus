import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_tenant/dashboard/data')({
  component: DataFetchingPage,
})

function DataFetchingPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Data Fetching Example</h1>
      <p className="mt-4 text-muted-foreground">
        TanStack Query / fetch – placeholder for implementation.
      </p>
    </div>
  )
}
