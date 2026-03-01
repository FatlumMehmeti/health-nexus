import { apiFetch } from '@/lib/api-client'

const ENROLLMENTS_BASE = (tenantId: number) =>
  `api/tenants/${tenantId}/enrollments`

export interface EnrollmentStatusApi {
  id: number
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  activated_at: string | null
  cancelled_at: string | null
  expires_at: string | null
  updated_at: string | null
}

export interface EnrollmentCreateApi {
  patient_user_id: number
  user_tenant_plan_id: number
}

export interface EnrollmentOperationalStatusApi {
  status: string
  is_active: boolean
  is_expired: boolean
  can_transition: boolean
}

export const enrollmentsService = {
  list: (tenantId: number, patientUserId?: number) =>
    apiFetch<EnrollmentStatusApi[]>(
      `${ENROLLMENTS_BASE(tenantId)}${
        patientUserId ? `?patient_user_id=${patientUserId}` : ''
      }`,
      { method: 'GET' }
    ),

  get: (tenantId: number, enrollmentId: number) =>
    apiFetch<EnrollmentStatusApi>(
      `${ENROLLMENTS_BASE(tenantId)}/${enrollmentId}`,
      { method: 'GET' }
    ),

  create: (tenantId: number, body: EnrollmentCreateApi) =>
    apiFetch<EnrollmentStatusApi>(
      ENROLLMENTS_BASE(tenantId),
      { method: 'POST', body }
    ),

  transition: (
    tenantId: number,
    enrollmentId: number,
    target_status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED',
    reason?: string
  ) =>
    apiFetch<EnrollmentStatusApi>(
      `${ENROLLMENTS_BASE(tenantId)}/${enrollmentId}/transition`,
      {
        method: 'POST',
        body: { target_status, reason },
      }
    ),

  operationalStatus: (tenantId: number, enrollmentId: number) =>
    apiFetch<EnrollmentOperationalStatusApi>(
      `${ENROLLMENTS_BASE(tenantId)}/${enrollmentId}/status`,
      { method: 'GET' }
    ),
}