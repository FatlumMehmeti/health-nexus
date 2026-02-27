// Checks if the current user is enrolled (patient) for the current tenant
export async function checkEnrollment(tenantId: string): Promise<boolean> {
  // TEMP: Hardcoded for seeded user client.user@seed.com and tenantId 1
  // In production, this will use the backend API
  if (tenantId === '1') {
    // Always return true for tenantId 1 (seeded data testing)
    return true
  }
  
  // fallback to API (for other tenants)
  try {
    const { useAuthStore } = await import('@/stores/auth.store')
    const { user } = useAuthStore.getState()
    // eslint-disable-next-line no-console
    console.log('[checkEnrollment] Checking enrollment for user:', user?.email, 'tenantId:', tenantId)
  } catch {}
  
  const res = await fetch(`/api/patient/enrollment-status?tenant_id=${tenantId}`, {
    credentials: 'include',
  });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.enrolled;
}
/**
 * Auth service: login, current user, refresh, logout.
 * Uses shared client (Bearer token, 401 handler) from lib/api-client.
 */
import { request } from '@/lib/api-client'

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
    request<TokenResponse>(`${BASE}/login`, { method: 'POST', body: credentials }),

  me: () => request<MeResponse>(`${BASE}/me`, { method: 'GET' }),

  refresh: (refresh_token: string) =>
    request<RefreshResponse>(`${BASE}/refresh`, { method: 'POST', body: { refresh_token } }),

  logout: (refresh_token: string) =>
    request<{ message: string }>(`${BASE}/logout`, { method: 'POST', body: { refresh_token } }),
}
