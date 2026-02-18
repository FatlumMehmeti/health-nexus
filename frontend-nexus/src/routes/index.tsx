import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <span className="text-lg font-semibold">Health Nexus</span>
          <nav className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button size="sm" variant="ghost">
                Dashboard
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="sm">Join Dashboard</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <section className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Health Nexus
          </h1>
          <p className="text-lg text-muted-foreground">
            Connect, collaborate, and streamline healthcare workflows.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link to="/dashboard">
              <Button size="lg" className="min-w-[160px]">
                Join the Dashboard
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
