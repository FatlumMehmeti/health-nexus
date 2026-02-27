import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/lib/guards/requireAuth'
import DoctorAppointmentsPage from '@/components/DoctorAppointmentsPage'

export const Route = createFileRoute('/dashboard/appointments')({
  beforeLoad: requireAuth({ routeKey: 'DASHBOARD_DOCTOR_APPOINTMENTS' }),
  component: DoctorAppointmentsPage,
})
