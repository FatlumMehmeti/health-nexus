import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

export interface AppointmentStatusHistory {
  id: number
  appointment_id: number
  old_status: 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | null
  new_status: 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  changed_by: number | null
  changed_at: string // ISO string
}

export function useAppointmentStatusHistory(appointmentId: string) {
  return useQuery<AppointmentStatusHistory[]>({
    queryKey: ['appointment-status-history', appointmentId],
    queryFn: () =>
      apiFetch<AppointmentStatusHistory[]>(`/appointments/${appointmentId}/status-history`, { method: 'GET' }),
    enabled: !!appointmentId,
    refetchInterval: 10_000,
  })
}
