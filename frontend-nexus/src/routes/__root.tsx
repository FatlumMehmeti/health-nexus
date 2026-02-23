/**
 * Root layout: outlet, bootstrap rehydration, and session-expiration redirect.
 * On mount, if a token exists in storage we call ensureAuth() to hydrate user from /auth/me.
 */
import { Outlet, createRootRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { GlobalDialog } from '@/components/global-dialog'
import { useAuthStore } from '@/stores/auth.store'
import { getAccessToken } from '@/lib/api-client'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authErrorReason = useAuthStore((s) => s.authErrorReason)
  const ensureAuth = useAuthStore((s) => s.ensureAuth)

  // Bootstrap: rehydrate from persisted token (load user via /auth/me).
  useEffect(() => {
    if (getAccessToken() && !isAuthenticated) {
      ensureAuth()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  // Session expiration: redirect to /login with reason so the page can show "Session expired" / "Session revoked".
  useEffect(() => {
    if (pathname === '/login') return
    if (!isAuthenticated && (authErrorReason === 'expired' || authErrorReason === 'revoked')) {
      navigate({ to: '/login', search: { reason: authErrorReason, redirect: undefined }, replace: true })
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
