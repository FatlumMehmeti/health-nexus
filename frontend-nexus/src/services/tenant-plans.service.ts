import { apiFetch } from '@/lib/api-client'

// Raw plan shape returned by the backend /user-tenant-plans endpoints.
const BASE = '/user-tenant-plans'

export interface TenantPlanApi {
  id: number
  tenant_id: number
  name: string
  description?: string | null
  price: number
  duration?: number | null
  max_appointments?: number | null
  max_consultations?: number | null
  is_active?: boolean | null
}

export interface TenantPlanCreateApi {
  tenant_id: number
  name: string
  description?: string | null
  price: number
  duration?: number | null
  max_appointments?: number | null
  max_consultations?: number | null
  is_active?: boolean | null
}

export interface TenantPlanUpdateApi {
  name?: string
  description?: string | null
  price?: number
  duration?: number | null
  max_appointments?: number | null
  max_consultations?: number | null
  is_active?: boolean | null
}

// Thin client for the user_tenant_plan FastAPI router.
export const tenantPlansService = {
  listByTenant: (tenantId: number) =>
    apiFetch<TenantPlanApi[]>(`${BASE}/tenant/${tenantId}`, { method: 'GET' }),

  create: (data: TenantPlanCreateApi) =>
    apiFetch<TenantPlanApi>(BASE + '/', { method: 'POST', body: data }),

  update: (id: number, data: TenantPlanUpdateApi) =>
    apiFetch<TenantPlanApi>(`${BASE}/${id}`, { method: 'PUT', body: data }),
}

