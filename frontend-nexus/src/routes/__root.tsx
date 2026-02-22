
import { Outlet, createRootRoute, useNavigate, useRouterState} from '@tanstack/react-router'
import { useEffect } from 'react'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { GlobalDialog } from '@/components/global-dialog'
import { useAuthStore } from '@/stores/auth.store'


export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authErrorReason = useAuthStore((s) => s.authErrorReason)

  // Session Expiration Handling:
  // If auth is cleared due to an expired/revoked session, redirect to login with a reason.
  useEffect(() => {
    if (pathname === '/login') return
    if (!isAuthenticated && (authErrorReason === 'expired' || authErrorReason === 'revoked')) {
      navigate({ to: '/login', search: { reason: authErrorReason }, replace: true })
    }
  }, [authErrorReason, isAuthenticated, navigate, pathname])

  return (
    <>
      <div className="min-h-screen">
        <Outlet />
      </div>
      <GlobalDialog />
    </>
  )
}
