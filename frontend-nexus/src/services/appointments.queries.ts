import { useQuery } from '@tanstack/react-query'
import { getDoctorAvailability } from './appointments.service'

export function useDoctorAvailability(doctorId: string, date: string) {
  return useQuery({
    queryKey: ['doctor-availability', doctorId, date],
    queryFn: () => getDoctorAvailability(doctorId, date),
    enabled: Boolean(doctorId && date),
  })
}
