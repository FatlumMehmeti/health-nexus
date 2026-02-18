import { Outlet, createFileRoute } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'

export const Route = createFileRoute('/_tenant/dashboard')({
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
