import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { usePatientAppointments, type PatientAppointment } from '@/services/appointments.patient'
import { StatusBadge, type AppointmentStatus } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { useState, useMemo } from 'react'
import { NotificationBell } from '@/components/NotificationBell'

export const Route = createFileRoute('/appointments/my')({
  beforeLoad: async () => {
    const { ensureAuth } = useAuthStore.getState()
    await ensureAuth()
    const state = useAuthStore.getState()
    if (!state.user) {
      throw redirect({ to: '/login', search: { reason: undefined, redirect: '/appointments/my' } })
    }
    // Seed-user shortcut
    if (state.user.email === 'client.user@seed.com' && !state.tenantId) {
      useAuthStore.setState({ tenantId: '1' })
    }
  },
  component: MyAppointmentsPage,
})

type FilterStatus = 'ALL' | AppointmentStatus

function toNaiveDate(iso: string): Date {
  return new Date(iso.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, ''))
}

function MyAppointmentsPage() {
  const { data: appointments = [], isLoading, isError, error } = usePatientAppointments()
  const [filter, setFilter] = useState<FilterStatus>('ALL')

  const filtered = useMemo(() => {
    if (filter === 'ALL') return appointments
    return appointments.filter((a) => a.status === filter)
  }, [appointments, filter])

  const filters: FilterStatus[] = ['ALL', 'REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

  if (isLoading) return <div className="p-8">Loading appointments…</div>
  if (isError) return <div className="p-8 text-destructive">{(error as Error)?.message || 'Error loading appointments'}</div>

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="border-b bg-linear-to-r from-primary/5 to-transparent py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Appointments</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              View and manage your booked appointments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link to="/appointments/book">
              <Button variant="default" size="sm">Book New</Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await useAuthStore.getState().logout()
                window.location.href = '/login'
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Status filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              {f === 'ALL' && ` (${appointments.length})`}
            </button>
          ))}
        </div>

        {/* Appointment list */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-muted-foreground mb-4">
                {filter === 'ALL'
                  ? "You haven't booked any appointments yet."
                  : `No ${filter.toLowerCase()} appointments found.`}
              </p>
              {filter === 'ALL' && (
                <Link to="/appointments/book">
                  <Button>Book an Appointment</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((appt) => (
              <AppointmentRow key={appt.id} appointment={appt} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AppointmentRow({ appointment }: { appointment: PatientAppointment }) {
  const dt = toNaiveDate(appointment.appointment_datetime)
  const dateStr = format(dt, 'EEE, MMM d, yyyy')
  const timeStr = format(dt, 'h:mm a')

  return (
    <Link
      to="/appointments/$appointmentId"
      params={{ appointmentId: String(appointment.id) }}
      search={{ datetime: appointment.appointment_datetime }}
    >
      <Card className="transition-colors hover:bg-muted/40 cursor-pointer">
        <CardContent className="flex items-center justify-between py-4 px-5">
          <div className="flex items-center gap-4">
            {/* Date badge */}
            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="text-[10px] font-semibold uppercase leading-none">
                {format(dt, 'MMM')}
              </span>
              <span className="text-lg font-bold leading-tight">{format(dt, 'd')}</span>
            </div>

            <div>
              <p className="font-medium text-foreground">{dateStr}</p>
              <p className="text-sm text-muted-foreground">{timeStr} · 30 min</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={appointment.status} />
            {/* Chevron */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
