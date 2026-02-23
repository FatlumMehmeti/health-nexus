/**
 * Shared API client for backend (FastAPI) requests.
 *
 * - Base URL: VITE_API_BASE_URL or http://localhost:8000 (backend).
 * - Automatically adds Authorization: Bearer <token> when a token is in memory/storage.
 * - Normalizes errors into ApiError (status, message, optional data). For 4xx/5xx, message prefers body.detail or body text.
 * - On 401, invokes the handler registered via setUnauthorizedHandler (used by auth store to expire session and redirect).
 */
export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8000'

export type ApiErrorShape = {
  status: number
  message: string
  data?: unknown
}

/** Thrown by request() on non-2xx or network failure. status 0 indicates a network error. */
export class ApiError extends Error implements ApiErrorShape {
  status: number
  data?: unknown

  constructor({ status, message, data }: ApiErrorShape) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/** localStorage keys for auth token persistence (used on bootstrap to rehydrate via /auth/me). */
const ACCESS_TOKEN_KEY = 'health-nexus.accessToken'
const REFRESH_TOKEN_KEY = 'health-nexus.refreshToken'

/** Read from localStorage without throwing (e.g. in SSR or private mode). */
function safeGetStorageItem(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** Write or remove a key in localStorage; no-op if storage is unavailable. */
function safeSetStorageItem(key: string, value: string | null) {
  try {
    if (!globalThis.localStorage) return
    if (value === null) globalThis.localStorage.removeItem(key)
    else globalThis.localStorage.setItem(key, value)
  } catch {
    // ignore storage failures (private mode / disabled storage)
  }
}

let accessToken: string | null = safeGetStorageItem(ACCESS_TOKEN_KEY)
let refreshToken: string | null = safeGetStorageItem(REFRESH_TOKEN_KEY)

export function getAccessToken(): string | null {
  return accessToken
}

export function getRefreshToken(): string | null {
  return refreshToken
}

/** Update in-memory and persisted tokens. Pass refreshToken only when it changes (e.g. after login). */
export function setTokens(tokens: { accessToken: string | null; refreshToken?: string | null }) {
  accessToken = tokens.accessToken
  safeSetStorageItem(ACCESS_TOKEN_KEY, accessToken)

  if ('refreshToken' in tokens) {
    refreshToken = tokens.refreshToken ?? null
    safeSetStorageItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

export function clearTokens() {
  setTokens({ accessToken: null, refreshToken: null })
}

type UnauthorizedHandler = (err: ApiError) => void

let onUnauthorized: UnauthorizedHandler | undefined

/** Register a callback for every 401 response. Auth store uses this to expire session and redirect to /login?reason=expired. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | undefined) {
  onUnauthorized = handler
}

function joinUrl(base: string, path: string): string {
  if (!path.startsWith('/')) path = `/${path}`
  return base.replace(/\/+$/, '') + path
}

async function parseJsonSafely(res: Response): Promise<unknown | undefined> {
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) return undefined
  try {
    return await res.json()
  } catch {
    return undefined
  }
}

/** For non-JSON error bodies (e.g. 500 plain text), we still surface the message. */
async function readTextSafely(res: Response): Promise<string | undefined> {
  try {
    const text = await res.text()
    return text.trim() ? text : undefined
  } catch {
    return undefined
  }
}

/**
 * Fetch path against API_BASE_URL with Bearer token and JSON handling.
 * Throws ApiError on !res.ok; triggers onUnauthorized on 401.
 */
export async function request<TResponse = unknown>(
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<TResponse> {
  const headers: Record<string, string> = {
    ...(init.headers ?? {}),
  }

  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(joinUrl(API_BASE_URL, path), {
      ...init,
      headers,
    })
  } catch (cause) {
    throw new ApiError({
      status: 0,
      message: 'Network error',
      data: cause,
    })
  }

  const data = await parseJsonSafely(res)
  const text = data === undefined ? await readTextSafely(res) : undefined

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'detail' in data && typeof (data as any).detail === 'string'
        ? (data as any).detail
        : text ?? res.statusText) || 'Request failed'

    const err = new ApiError({ status: res.status, message, data: data ?? text })
    if (res.status === 401) onUnauthorized?.(err)
    throw err
  }

  return data as TResponse
}

