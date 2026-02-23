import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/lib/guards/requireAuth'

export const Route = createFileRoute('/dashboard/landing-pages')({
  beforeLoad: requireAuth({ routeKey: 'DASHBOARD_LANDING_PAGES' }),
  component: LandingPagesLayout,
})

function LandingPagesLayout() {
  return (
    <div className="p-8">
      <Outlet />
    </div>
  )
}
