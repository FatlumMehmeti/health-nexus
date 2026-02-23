import type { AddUserInput, AddUserResponse, UsersResponse } from '@/interfaces'

const DUMMY_JSON_USERS = 'https://dummyjson.com/users'

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export const usersService = {
  list: () => fetchJson<UsersResponse>(DUMMY_JSON_USERS),

  add: (data: AddUserInput) =>
    fetchJson<AddUserResponse>(`${DUMMY_JSON_USERS}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
}
