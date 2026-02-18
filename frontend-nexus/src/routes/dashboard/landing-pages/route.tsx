import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/landing-pages')({
  component: LandingPagesLayout,
})

function LandingPagesLayout() {
  return (
    <div className="p-8">
      <Outlet />
    </div>
  )
}
