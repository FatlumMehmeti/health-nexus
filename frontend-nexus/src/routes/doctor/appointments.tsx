import { createFileRoute } from '@tanstack/react-router'
import DoctorAppointmentsPage from '@/components/DoctorAppointmentsPage'

export const Route = createFileRoute('/doctor/appointments')({
  component: DoctorAppointmentsPage,
})
