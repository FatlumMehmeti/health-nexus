import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_about/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">About</h1>
      <p className="mt-4 text-muted-foreground">
        Learn more about Health Nexus.
      </p>
    </div>
  )
}
