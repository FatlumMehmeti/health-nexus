import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/molecules/app-sidebar'
import { SiteHeader } from '@/components/molecules/site-header'
import { useAuthStore } from '@/stores/auth.store'

// Protects the whole dashboard: unauthenticated users are sent to login.
// Session-expiration handling optionally adds a `?reason=` query so the login page can explain why.
export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    const { isAuthenticated, authErrorReason } = useAuthStore.getState()
    if (!isAuthenticated) {
      // Guard behavior:
      // - expired/revoked → /login?reason=...
      // - otherwise → /login
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
