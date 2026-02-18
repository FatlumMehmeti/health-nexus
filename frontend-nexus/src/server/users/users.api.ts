const USERS_API = 'https://dummyjson.com/users'

export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  image: string
  age: number
  company: { name: string; title: string }
}

export interface UsersResponse {
  users: User[]
  total: number
  skip: number
  limit: number
}

export async function fetchUsers(): Promise<UsersResponse> {
  const res = await fetch(USERS_API)
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}
