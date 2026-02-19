import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/molecules/app-sidebar'
import { SiteHeader } from '@/components/molecules/site-header'
import { useAuthStore } from '@/stores/auth.store'

// Protects the whole dashboard: unauthenticated users are sent to login.
export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) throw redirect({ to: '/login' })
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
