import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_tenant/dashboard/forms')({
  component: FormsExamplePage,
})

function FormsExamplePage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Form Handling Example</h1>
      <p className="mt-4 text-muted-foreground">
        React Hook Form + Zod – placeholder for implementation.
      </p>
    </div>
  )
}
