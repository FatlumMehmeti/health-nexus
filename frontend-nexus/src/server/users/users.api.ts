import type { AddUserInput, AddUserResponse, UsersResponse } from '@/interfaces/users'
import { useAuthStore } from '@/stores/auth.store'

export type { AddUserInput, AddUserResponse, User, UsersResponse } from '@/interfaces/users'

const USERS_API = 'https://dummyjson.com/users'

// Minimal fetch wrapper to handle expired/revoked sessions without backend coupling.
// - Detects 401 responses
// - Attempts a token refresh (placeholder)
// - Expires the session (auto-logout) if refresh fails
async function fetchWithSessionHandling(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status !== 401) return res

  const { refresh, expireSession } = useAuthStore.getState()

  let refreshed = false
  try {
    refreshed = await refresh()
  } catch {
    refreshed = false
  }

  if (refreshed) return fetch(input, init)

  expireSession()
  return res
}

export async function fetchUsers(): Promise<UsersResponse> {
  const res = await fetchWithSessionHandling(USERS_API)
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export async function addUser(data: AddUserInput): Promise<AddUserResponse> {
  const res = await fetchWithSessionHandling(`${USERS_API}/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to add user')
  return res.json()
}
