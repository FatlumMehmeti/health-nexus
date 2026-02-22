/**
 * Dashboard layout route: protects all /dashboard/*.
 *
 * beforeLoad: runs ensureAuth() (loads profile from /auth/me or JWT if 403), then redirects to /login
 * if not authenticated. When the session was expired or revoked, redirect includes ?reason= so the login
 * page can show "Session expired" or "Session revoked". Child routes add their own RBAC via canAccess() in
 * their beforeLoad (e.g. /dashboard/data requires DASHBOARD_DATA).
 */
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/molecules/app-sidebar'
import { SiteHeader } from '@/components/molecules/site-header'
import { useAuthStore } from '@/stores/auth.store'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const { ensureAuth } = useAuthStore.getState()
    await ensureAuth()
    const { isAuthenticated, authErrorReason } = useAuthStore.getState()
    if (!isAuthenticated) {
      if (authErrorReason === 'expired') throw redirect({ to: '/login', search: { reason: 'expired' } })
      if (authErrorReason === 'revoked') throw redirect({ to: '/login', search: { reason: 'revoked' } })
      throw redirect({ to: '/login', search: { reason: undefined } })
    }
  },
  component: TenantLayout,
})

function TenantLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-4 pb-4 @container/main">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
