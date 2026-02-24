/**
 * Authenticated tenant selector: /tenants
 * Protected with APP_TENANT_SELECTOR (CLIENT, DOCTOR, SALES, TENANT_MANAGER).
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { requireAuth } from '@/lib/guards/requireAuth'

export const Route = createFileRoute('/tenants')({
  beforeLoad: requireAuth({ routeKey: 'APP_TENANT_SELECTOR' }),
  component: TenantSelectorPage,
})

function TenantSelectorPage() {
  return (
    <div className="container mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Select tenant</h1>
      <p className="mt-2 text-muted-foreground">
        Choose a tenant to continue. Placeholder for tenant list / selection.
      </p>
      <div className="mt-6">
        <Link
          to="/dashboard"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
