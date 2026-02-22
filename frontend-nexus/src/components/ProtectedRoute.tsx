/**
 * Wrapper that validates token + role before rendering children.
 * Uses shared getProtectedRedirect(); use when guarding a subtree without route-level beforeLoad.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useRouterState } from '@tanstack/react-router'
import { getProtectedRedirect, type ProtectedRedirect, type RequireAuthOptions } from '@/lib/guards/requireAuth'

export interface ProtectedRouteProps extends RequireAuthOptions {
  children: ReactNode
  /** Shown while auth is being checked. Default: null. */
  fallback?: ReactNode
}

export function ProtectedRoute({ children, routeKey, fallback = null }: ProtectedRouteProps) {
  const [redirect, setRedirect] = useState<ProtectedRedirect | null | undefined>(undefined)
  const location = useRouterState({ select: (s) => s.location })

  useEffect(() => {
    let cancelled = false
    const searchObj = location.search as Record<string, unknown> | undefined
    const q = new URLSearchParams()
    if (searchObj && typeof searchObj === 'object')
      for (const [k, v] of Object.entries(searchObj))
        if (v != null && v !== '') q.set(k, String(v))
    const currentPath = location.pathname + (q.toString() ? `?${q.toString()}` : '')

    getProtectedRedirect(routeKey != null ? { routeKey } : undefined, currentPath).then((result) => {
      if (!cancelled) setRedirect(result ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [location.pathname, location.search, routeKey])

  if (redirect === undefined) return <>{fallback}</>
  if (redirect) {
    const search = redirect.to === '/login' ? redirect.search : undefined
    return <Navigate to={redirect.to} search={search} replace />
  }
  return <>{children}</>
}
