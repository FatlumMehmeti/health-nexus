import { create } from 'zustand'
import type { Role } from '@/lib/rbacMatrix'

// Centralized client-side authentication store.
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

// Auth error reasons used to drive UX (eg. redirect messaging) without backend coupling.
// Session-expiration handling sets this so guards can redirect with a `?reason=` query.
export type AuthErrorReason = 'expired' | 'revoked' | null

export interface AuthUser {
  id: string
  email: string
  fullName?: string
}

// Minimal shape required by guards and authenticated UI.
interface AuthState {
  status: AuthStatus
  user?: AuthUser
  role?: Role
  tenantId?: string
  isAuthenticated: boolean
  // When present, guards can redirect to `/login?reason=...` for user-facing messaging.
  authErrorReason: AuthErrorReason
  setMockUser: (role: Role, tenantId?: string) => void
  clearAuth: () => void
  expireSession: () => void
  revokeSession: () => void
  login: () => never
  logout: () => never
  refresh: () => never
  loadProfile: () => never
}

// Default unauthenticated state used by clearAuth and initialization.
const initialState: Pick<
  AuthState,
  'status' | 'user' | 'role' | 'tenantId' | 'isAuthenticated' | 'authErrorReason'
> = {
  status: 'unauthenticated',
  user: undefined,
  role: undefined,
  tenantId: undefined,
  isAuthenticated: false,
  authErrorReason: null,
}

// Shared auth store instance to be used across the application.
export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  // DEV-only helper that simulates a successful login for demos and tests.
  setMockUser: (role, tenantId) =>
    set({
      status: 'authenticated',
      user: {
        id: 'mock-user-id',
        email: 'mock.user@example.com',
        fullName: 'Mock User',
      },
      role,
      tenantId,
      isAuthenticated: true,
      authErrorReason: null,
    }),
  // Clears auth and any session-expiration reason (fresh unauthenticated state).
  clearAuth: () => set(initialState),
  // Marks the current session as expired and clears auth data (no backend required).
  expireSession: () =>
    set({
      ...initialState,
      authErrorReason: 'expired',
    }),
  // Marks the current session as revoked and clears auth data (no backend required).
  revokeSession: () =>
    set({
      ...initialState,
      authErrorReason: 'revoked',
    }),
  // Placeholders for future real auth flows.
  // These are intentionally strict so accidental usage is visible during DEV.
  login: () => {
    throw new Error('Not implemented: login')
  },
  logout: () => {
    throw new Error('Not implemented: logout')
  },
  refresh: () => {
    throw new Error('Not implemented: refresh')
  },
  loadProfile: () => {
    throw new Error('Not implemented: loadProfile')
  },
}))

