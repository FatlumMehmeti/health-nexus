import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'

// Login placeholder used for DEV-only auth flows.
export const Route = createFileRoute('/login')({
  // Minimal search parsing to support reason-based messaging (eg. session expired).
  validateSearch: (search: Record<string, unknown>) => ({
    reason: typeof search.reason === 'string' ? search.reason : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const setMockUser = useAuthStore((state) => state.setMockUser)
  const { reason } = Route.useSearch()
  const isDev = import.meta.env?.DEV ?? false
  const reasonMessage =
    reason === 'expired'
      ? 'Session expired, please sign in again.'
      : reason === 'revoked'
        ? 'Session revoked, please sign in again.'
        : null

  if (!isDev) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-4"
        data-testid="login-page"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        {reasonMessage ? (
          <div className="rounded-md border px-3 py-2 text-sm" data-testid="session-reason-message">
            {reasonMessage}
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Login is not available yet.
        </p>
        <Link to="/" className="underline underline-offset-4">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4"
      data-testid="login-page"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in (DEV only)</h1>
        <p className="text-sm text-muted-foreground">
          Select a role to simulate authentication. No real backend calls are performed.
        </p>
      </div>

      {reasonMessage ? (
        <div className="rounded-md border px-3 py-2 text-sm" data-testid="session-reason-message">
          {reasonMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-center gap-3" data-testid="dev-mock-login">
        <Button variant="default" onClick={() => setMockUser('SUPER_ADMIN')}>
          Continue as Super Admin
        </Button>
        <Button variant="outline" onClick={() => setMockUser('TENANT_MANAGER')}>
          Continue as Tenant Manager
        </Button>
        <Button variant="outline" onClick={() => setMockUser('DOCTOR')}>
          Continue as Doctor
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        <span>Ready?</span>{' '}
        <Link to="/dashboard" className="underline underline-offset-4">
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
