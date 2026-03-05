import { PublicAuthHeader } from '@/components/molecules/public-auth-header';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.9_0.01_265/0.5)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.9_0.01_265/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <PublicAuthHeader
        className="z-50"
        containerClassName="h-16 px-6"
        showRightSlotWhenAuthenticated
        rightSlot={
          isAuthenticated ? (
            <Link to="/tenants">
              <Button size="sm" className="font-medium shadow-sm">
                Go to tenants
              </Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button size="sm" className="font-medium shadow-sm">
                Join Platform
              </Button>
            </Link>
          )
        }
      />

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
            A unified platform for healthcare teams to coordinate
            care, share insights, and deliver better outcomes.
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
            <Link to="/appointments/book" preload={false}>
              <Button
                size="lg"
                className="min-w-[180px] shadow-md transition-all hover:shadow-lg bg-primary text-primary-foreground border-2 border-primary/70 ring-2 ring-primary/10 hover:bg-primary/90 hover:ring-primary/20 focus:ring-4 focus:ring-primary/30"
                style={{
                  boxShadow: '0 4px 24px 0 rgba(80, 72, 229, 0.10)',
                }}
              >
                Book Appointment
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
