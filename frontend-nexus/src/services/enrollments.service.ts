import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'

export interface EnrollmentDoctor {
  user_id: number
  name: string
  specialization: string | null
}

export interface ApprovedTenant {
  id: number
  name: string
  moto: string | null
  doctors: EnrollmentDoctor[]
}

async function fetchApprovedTenants(): Promise<ApprovedTenant[]> {
  const res = await apiFetch('/enrollments/approved-tenants')
  if (!res.ok) throw new Error('Failed to load approved tenants')
  return res.json()
}

export function useApprovedTenants() {
  const token = useAuthStore((s) => s.token)
  return useQuery<ApprovedTenant[]>({
    queryKey: ['approved-tenants'],
    queryFn: fetchApprovedTenants,
    enabled: !!token,
  })
}
