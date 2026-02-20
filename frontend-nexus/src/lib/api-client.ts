/**
 * API client for Health Nexus backend.
 * Handles base URL, errors (FastAPI format), and request/response middleware.
 */

/** Base URL for the backend API (from env, defaults to localhost:8000) */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/** Validation error from FastAPI (422 Unprocessable Entity) */
export interface ValidationError {
  loc: (string | number)[]
  msg: string
  type: string
}

/** FastAPI error response shape */
interface ApiErrorPayload {
  detail: string | ValidationError[]
}

/** Structured error thrown by the API client */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail: string | ValidationError[]
  ) {
    super(message)
    this.name = 'ApiError'
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  /** Human-readable message for display */
  get displayMessage(): string {
    if (typeof this.detail === 'string') return this.detail
    if (Array.isArray(this.detail) && this.detail.length > 0) {
      return this.detail.map((e) => e.msg).join('; ')
    }
    return this.message
  }

  /** Whether this is a validation error (422) */
  get isValidation(): boolean {
    return this.status === 422 && Array.isArray(this.detail)
  }
}

/** Options for apiFetch */
export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Skip JSON parse on response (e.g. 204 No Content) */
  skipJson?: boolean
}

/**
 * Fetch wrapper with backend base URL, error parsing, and JSON handling.
 * Use this for all Health Nexus backend API calls.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, skipJson = false, headers: customHeaders, ...fetchOpts } = options

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

  const init: RequestInit = {
    ...fetchOpts,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  }

  let res: Response
  try {
    res = await fetch(url, init)
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
      'Unable to reach the server. Check your connection.'
    )
  }

  if (!res.ok) {
    let detail: string | ValidationError[] = res.statusText
    const contentType = res.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      try {
        const payload = (await res.json()) as ApiErrorPayload
        if (payload?.detail != null) detail = payload.detail
      } catch {
        // keep default detail
      }
    }
    throw new ApiError(
      `Request failed: ${res.status} ${res.statusText}`,
      res.status,
      detail
    )
  }

  if (skipJson || res.status === 204) {
    return undefined as T
  }

  const ct = res.headers.get('content-type')
  if (!ct?.includes('application/json')) {
    return (await res.text()) as unknown as T
  }

  return res.json() as Promise<T>
}

/** Type guard for ApiError */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

/** Convenience methods for common verbs */
export const api = {
  get: <T>(path: string, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: 'GET' }),

  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: 'PATCH', body }),

  delete: <T>(path: string, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: 'DELETE', skipJson: true }),
}
