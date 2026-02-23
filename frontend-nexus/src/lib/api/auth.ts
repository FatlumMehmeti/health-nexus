/**
 * Auth API: login, current user, refresh, and logout.
 * All calls go through the shared client (base URL, Bearer token, error normalization).
 * Shapes match the FastAPI auth router: POST /auth/login, GET /auth/me, etc.
 */
import { request } from './client'

/** Payload for POST /auth/login. */
export type LoginCredentials = {
  email: string
  password: string
}

/** Response from POST /auth/login and POST /auth/refresh. */
export type TokenResponse = {
  access_token: string
  token_type: 'bearer'
  refresh_token: string | null
}

/** POST /auth/login. Returns tokens on success; throws ApiError on 401. */
export async function login(credentials: LoginCredentials): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

/** Response from GET /auth/me. user is the JWT payload (user_id, email, role, optional tenant_id). */
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

/** GET /auth/me. Requires Authorization: Bearer <access_token>. Used to hydrate user/role after login or reload. */
export async function me(): Promise<MeResponse> {
  return request<MeResponse>('/auth/me', { method: 'GET' })
}

/** Response from POST /auth/refresh. */
export type RefreshResponse = {
  access_token: string
  token_type: 'bearer'
  refresh_token?: string | null
}

/** POST /auth/refresh. Issue a new access token; 401 if refresh token is invalid or revoked. */
export async function refresh(refresh_token: string): Promise<RefreshResponse> {
  return request<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token }),
  })
}

/** POST /auth/logout. Revokes the session for the given refresh token. Best-effort; we clear local state regardless. */
export async function logout(refresh_token: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token }),
  })
}

