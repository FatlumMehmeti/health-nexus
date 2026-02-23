/**
 * Shared auth + RBAC guard logic. Single place for "ensure auth, then decide redirect".
 *
 * - Unauthenticated → { to: '/login', search } (preserves redirect param when possible).
 * - Authenticated but forbidden (RBAC) → { to: '/unauthorized' }.
 * - Otherwise → null (allow access).
 */
import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { can, type UserWithRole } from '@/lib/rbac'
import type { RouteKey } from '@/lib/rbacMatrix'

export type RequireAuthOptions = {
  routeKey?: RouteKey
}

export type ProtectedRedirect =
  | { to: '/login'; search: { reason?: 'expired' | 'revoked'; redirect?: string } }
  | { to: '/unauthorized' }

/**
 * Runs ensureAuth(), then returns redirect payload if user should be sent to login or unauthorized; otherwise null.
 * Pass currentPath when available (e.g. from router location) so login can redirect back; otherwise uses window.
 */
export async function getProtectedRedirect(
  options?: RequireAuthOptions,
  currentPath?: string
): Promise<ProtectedRedirect | null> {
  const { ensureAuth } = useAuthStore.getState()
  await ensureAuth()

  const state = useAuthStore.getState()
  if (!state.isAuthenticated) {
    const search: { reason?: 'expired' | 'revoked'; redirect?: string } = {}
    if (state.authErrorReason) search.reason = state.authErrorReason
    const path =
      currentPath ??
      (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : undefined)
    if (path && path !== '/login') search.redirect = path
    return { to: '/login', search }
  }

  if (options?.routeKey) {
    const user: UserWithRole = { role: state.role }
    if (!can(user, options.routeKey)) return { to: '/unauthorized' }
  }
  return null
}

/** Returns a beforeLoad handler: throws redirect to /login or /unauthorized when access is denied. */
export function requireAuth(options?: RequireAuthOptions): () => Promise<void> {
  return async () => {
    const result = await getProtectedRedirect(options)
    if (result) throw redirect(result)
  }
}
