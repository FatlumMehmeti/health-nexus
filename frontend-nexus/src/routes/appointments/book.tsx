import { createFileRoute, redirect, useNavigate, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { checkEnrollment } from '@/services/auth.service'
import { useState } from 'react'
import { useDoctorAvailability } from '@/services/appointments.queries'
import { useBookAppointment } from '@/services/appointments.mutations'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { isApiError } from '@/lib/api-client'
import { NotificationBell } from '@/components/NotificationBell'

export const Route = createFileRoute('/appointments/book')({
  beforeLoad: async () => {
    const { ensureAuth } = useAuthStore.getState()
    await ensureAuth()

    // Re-read state after ensureAuth (it may have updated)
    const state = useAuthStore.getState()

    // Hardcode bypass for seeded enrolled user: client.user@seed.com with tenantId 1
    if (state.user?.email === 'client.user@seed.com') {
      if (!state.tenantId) useAuthStore.setState({ tenantId: '1' })
      return
    }

    if (!state.user) {
      throw redirect({ to: '/login', search: { reason: undefined, redirect: '/appointments/book' } })
    }

    const roleValue = state.role as unknown as string | undefined
    const isPatient = state.role === 'CLIENT' || roleValue === 'PATIENT'
    if (!isPatient) {
      throw redirect({ to: '/unauthorized' })
    }

    // Check enrollment status from backend
    if (!state.tenantId) {
      throw redirect({ to: '/enrollment' })
    }
    const isEnrolled = await checkEnrollment(state.tenantId)
    if (!isEnrolled) {
      throw redirect({ to: '/enrollment' })
    }
  },
  component: AppointmentBookingPage,
})

function AppointmentBookingPage() {
  // Hardcoded doctorId for demo (from seed data: doctor.one@seed.com is user_id=3)
  const doctorId = '3'
  const { tenantId, user } = useAuthStore()
  const [date, setDate] = useState<Date | undefined>(undefined)
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : ''
  
  // eslint-disable-next-line no-console
  console.log('[Book] Component rendered. doctorId:', doctorId, 'tenantId:', tenantId, 'user:', user?.email)
  
  const {
    data: availability,
    isLoading,
    isError,
    error,
  } = useDoctorAvailability(doctorId, formattedDate)
  
  // eslint-disable-next-line no-console
  console.log('[Book] Availability query. formattedDate:', formattedDate, 'isLoading:', isLoading, 'isError:', isError, 'slots:', availability?.slots.length)
  
  const bookAppointment = useBookAppointment()

  const handleSlotClick = (slotTime: string) => {
    // eslint-disable-next-line no-console
    console.log('[Book] Slot clicked. slotTime:', slotTime, 'date:', date, 'tenantId:', tenantId)
    
    if (!date || !tenantId) {
      // eslint-disable-next-line no-console
      console.warn('[Book] Missing date or tenantId. date:', date, 'tenantId:', tenantId)
      return
    }

    // Build a naive ISO datetime string matching the backend's format
    // (no timezone offset — the backend treats these as clinic-local times)
    const isoDatetime = `${formattedDate}T${slotTime}:00`
    
    // eslint-disable-next-line no-console
    console.log('[Book] Booking appointment. datetime:', isoDatetime, 'doctorId:', doctorId)

    bookAppointment.mutate({
      tenant_id: tenantId,
      doctor_id: doctorId,
      appointment_datetime: isoDatetime,
    })
  }

  const handleDateChange = (newDate: Date | undefined) => {
    // eslint-disable-next-line no-console
    console.log('[Book] Date changed. newDate:', newDate ? format(newDate, 'yyyy-MM-dd') : 'undefined')
    setDate(newDate)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="border-b bg-linear-to-r from-primary/5 to-transparent py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Book an Appointment</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Select a date and available time slot with our healthcare provider
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link to="/appointments/my">
              <Button variant="outline" size="sm">My Appointments</Button>
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
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-5">
          {/* Calendar Section */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateChange}
                  disabled={(d: Date) => d < today}
                />
              </CardContent>
            </Card>
          </div>

          {/* Time Slots Section */}
          <div className="md:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  {date ? `Available Slots — ${format(date, 'MMMM d, yyyy')}` : 'Available Time Slots'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!date && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground">Select a date to see available time slots</p>
                  </div>
                )}
                
                {date && isLoading && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
                    <p className="text-sm text-muted-foreground">Loading slots...</p>
                  </div>
                )}
                
                {date && isError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                    <p className="text-sm font-medium text-destructive">Error Loading Slots</p>
                    <p className="mt-1 text-sm text-destructive/80">
                      {isApiError(error) ? error.displayMessage : error?.message || 'Failed to load available slots.'}
                    </p>
                  </div>
                )}
                
                {date && !isLoading && !isError && availability && availability.slots.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-muted-foreground">No slots available for this date. Try another date.</p>
                  </div>
                )}
                
                {date && !isLoading && !isError && availability && availability.slots.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {availability.slots.map((slot) => {
                      const appointmentDateTime = new Date(date)
                      const [hours, minutes] = slot.time.split(':').map(Number)
                      appointmentDateTime.setHours(hours, minutes, 0, 0)
                      const isPast = appointmentDateTime < new Date()

                      return (
                        <Button
                          key={slot.time}
                          variant={slot.available && !isPast ? 'default' : 'outline'}
                          size="sm"
                          disabled={!slot.available || isPast || bookAppointment.isPending}
                          className="font-medium"
                          onClick={() => handleSlotClick(slot.time)}
                        >
                          {slot.time}
                        </Button>
                      )
                    })}
                  </div>
                )}

                {bookAppointment.isError && (
                  <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                    <p className="text-sm font-medium text-destructive">Booking Failed</p>
                    <p className="mt-1 text-sm text-destructive/80">
                      {isApiError(bookAppointment.error) ? bookAppointment.error.displayMessage : bookAppointment.error?.message || 'Failed to book appointment'}
                    </p>
                  </div>
                )}
                
                {bookAppointment.isPending && (
                  <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                    <p className="text-sm text-blue-400">Booking appointment...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Card */}
        <Card className="mt-6 bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="space-y-1">
                <p className="text-foreground">
                  <span className="font-medium">Duration:</span> 30 minutes per appointment
                </p>
                <p className="text-muted-foreground">
                  Your appointment will be confirmed once booked. You will receive a confirmation notification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
