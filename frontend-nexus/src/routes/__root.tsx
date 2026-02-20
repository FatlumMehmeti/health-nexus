import { Outlet, createRootRoute } from '@tanstack/react-router'
import { GlobalDialog } from '@/components/global-dialog'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <div className="min-h-screen">
        <Outlet />
      </div>
      <GlobalDialog />
    </>
  )
}
