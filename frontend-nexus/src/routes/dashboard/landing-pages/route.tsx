import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { canAccess } from '@/lib/rbacMatrix'
import { useAuthStore } from '@/stores/auth.store'

export const Route = createFileRoute('/dashboard/landing-pages')({
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canAccess(role ?? undefined, 'DASHBOARD_LANDING_PAGES')) throw redirect({ to: '/unauthorized' })
  },
  component: LandingPagesLayout,
})

function LandingPagesLayout() {
  return (
    <div className="p-8">
      <Outlet />
    </div>
  )
}
