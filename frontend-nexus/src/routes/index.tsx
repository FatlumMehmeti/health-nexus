import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.9_0.01_265/0.5)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.9_0.01_265/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-6 mx-auto">
          <Link
            to="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <img
              src="/images/logo.webp"
              alt="Health Nexus"
              className="h-9 w-9 rounded-lg object-contain"
            />
            <span className="text-xl font-semibold tracking-tight">
              Health Nexus
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login" search={{ reason: undefined, redirect: undefined }}>
              <Button size="sm" variant="ghost" className="font-medium">
                Sign in
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="font-medium shadow-sm">
                Join Platform
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 sm:py-32">
        <section className="mx-auto max-w-2xl space-y-8 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            Healthcare, simplified
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Connect, collaborate, and
            <span className="block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              streamline workflows
            </span>
          </h1>
          <p className="mx-auto max-w-lg text-lg leading-relaxed text-muted-foreground">
            A unified platform for healthcare teams to coordinate care, share
            insights, and deliver better outcomes.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/register">
              <Button
                size="lg"
                className="min-w-[180px] shadow-md transition-all hover:shadow-lg"
              >
                Join the Platform
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
