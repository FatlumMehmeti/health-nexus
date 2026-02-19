import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

// Dedicated 403 screen for users without required permissions.
export const Route = createFileRoute('/unauthorized')({
  component: UnauthorizedPage,
})

function UnauthorizedPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center"
      data-testid="unauthorized-page"
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-amber-600">403 · Unauthorized</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          You do not have access to this area
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your current role does not include the permissions required to view this page.
          If you believe this is an error, please contact an administrator.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
        >
          Go back
        </Button>
        <Link to="/login">
          <Button>
            Go to login
          </Button>
        </Link>
      </div>
    </div>
  )
}

