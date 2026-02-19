import type { AddUserInput, AddUserResponse, UsersResponse } from '@/interfaces/users'

export type { AddUserInput, AddUserResponse, User, UsersResponse } from '@/interfaces/users'

const USERS_API = 'https://dummyjson.com/users'

export async function fetchUsers(): Promise<UsersResponse> {
  const res = await fetch(USERS_API)
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export async function addUser(data: AddUserInput): Promise<AddUserResponse> {
  const res = await fetch(`${USERS_API}/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to add user')
  return res.json()
}
