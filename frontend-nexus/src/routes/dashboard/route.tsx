/**
 * Dashboard layout: beforeLoad requireAuth() guards /dashboard/*; child routes use requireAuth({ routeKey }) for RBAC.
 * ProtectedRoute wraps content (shared getProtectedRedirect), so you get both route-level and component-level guard.
 */
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/molecules/app-sidebar'
import { SiteHeader } from '@/components/molecules/site-header'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { requireAuth } from '@/lib/guards/requireAuth'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireAuth(),
  component: TenantLayout,
})

function TenantLayout() {
  return (
    <ProtectedRoute fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <main className="flex flex-1 flex-col gap-4 pb-4 @container/main">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
