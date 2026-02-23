/**
 * Auth service: login, current user, refresh, logout.
 * Uses shared client (Bearer token, 401 handler) from lib/api.
 */
import { request } from '@/lib/api/client'

const BASE = '/api/auth'

/** Payload for POST /api/auth/login */
export type LoginCredentials = {
  email: string
  password: string
}

/** Response from login and refresh */
export type TokenResponse = {
  access_token: string
  token_type: 'bearer'
  refresh_token: string | null
}

/** Response from GET /api/auth/me */
export type MeResponse = {
  message: string
  user: {
    user_id: string | number
    email: string
    role?: string
    tenant_id?: string | number
    [key: string]: unknown
  }
}

export type RefreshResponse = {
  access_token: string
  token_type: 'bearer'
  refresh_token?: string | null
}

export const authService = {
  login: (credentials: LoginCredentials) =>
    request<TokenResponse>(`${BASE}/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  me: () => request<MeResponse>(`${BASE}/me`, { method: 'GET' }),

  refresh: (refresh_token: string) =>
    request<RefreshResponse>(`${BASE}/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),

  logout: (refresh_token: string) =>
    request<{ message: string }>(`${BASE}/logout`, {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),
}
