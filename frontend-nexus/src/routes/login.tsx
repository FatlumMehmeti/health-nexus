import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'

// Login placeholder used for DEV-only auth flows.
export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const setMockUser = useAuthStore((state) => state.setMockUser)

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

      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="default"
          onClick={() => setMockUser('SUPER_ADMIN')}
        >
          Continue as Super Admin
        </Button>
        <Button
          variant="outline"
          onClick={() => setMockUser('TENANT_MANAGER')}
        >
          Continue as Tenant Manager
        </Button>
        <Button
          variant="outline"
          onClick={() => setMockUser('DOCTOR')}
        >
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

