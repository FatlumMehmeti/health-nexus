import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { useDoctorAppointments } from '@/services/appointments.doctor'
import { useApproveAppointment, useCompleteAppointment, useRejectAppointment } from '@/services/appointments.doctor.mutations'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useState } from 'react'

/**
 * Strip timezone suffix (Z, +00:00, -05:00, etc.) so JS parses as local.
 * This keeps displayed times consistent with what the patient saw when booking.
 */
function toNaiveDate(iso: string): Date {
  return new Date(iso.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, ''))
}

const PAGE_SIZE = 3

function Pagination({ total, page, onPageChange }: { total: number; page: number; onPageChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </div>
  )
}

export default function DoctorAppointmentsPage() {
  const { data, isLoading, isError, error } = useDoctorAppointments()
  const approveMutation = useApproveAppointment()
  const completeMutation = useCompleteAppointment()
  const rejectMutation = useRejectAppointment()
  const [requestedPage, setRequestedPage] = useState(1)
  const [confirmedPage, setConfirmedPage] = useState(1)

  if (isLoading) return <div className="p-8">Loading...</div>
  if (isError) return <div className="p-8 text-red-500">{(error as Error)?.message || 'Error loading appointments'}</div>
  if (!data || data.length === 0) return <div className="p-8">No appointments found.</div>

  const requested = data.filter((a) => a.status === 'REQUESTED')
  const confirmed = data.filter((a) => a.status === 'CONFIRMED')

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Tabs defaultValue="REQUESTED" className="w-full">
        <TabsList>
          <TabsTrigger value="REQUESTED">Requested ({requested.length})</TabsTrigger>
          <TabsTrigger value="CONFIRMED">Confirmed ({confirmed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="REQUESTED">
          <div className="flex flex-col gap-4 mt-4">
            {requested.length === 0 && <span>No requested appointments.</span>}
            {requested.slice((requestedPage - 1) * PAGE_SIZE, requestedPage * PAGE_SIZE).map((appt) => {
              const isApproving = approveMutation.isPending && approveMutation.variables === appt.id
              const isRejecting = rejectMutation.isPending && rejectMutation.variables === appt.id
              return (
                <Card key={appt.id} className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Patient #{appt.patient_user_id}</CardTitle>
                    <StatusBadge status={appt.status} />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <span>Date: {format(toNaiveDate(appt.appointment_datetime), 'PPpp')}</span>
                    {appt.description && <span className="text-muted-foreground">Note: {appt.description}</span>}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="default"
                        disabled={isApproving || isRejecting}
                        onClick={async () => {
                          if (appt.status !== 'REQUESTED') return
                          try {
                            await approveMutation.mutateAsync(appt.id)
                            toast.success('Appointment approved')
                          } catch (err: any) {
                            toast.error(err?.message || 'Failed to approve')
                          }
                        }}
                      >
                        {isApproving ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={isApproving || isRejecting}
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          if (appt.status !== 'REQUESTED') return
                          try {
                            await rejectMutation.mutateAsync(appt.id)
                            toast.success('Appointment rejected — slot is now available again')
                          } catch (err: any) {
                            toast.error(err?.message || 'Failed to reject')
                          }
                        }}
                      >
                        {isRejecting ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            <Pagination total={requested.length} page={requestedPage} onPageChange={setRequestedPage} />
          </div>
        </TabsContent>
        <TabsContent value="CONFIRMED">
          <div className="flex flex-col gap-4 mt-4">
            {confirmed.length === 0 && <span>No confirmed appointments.</span>}
            {confirmed.slice((confirmedPage - 1) * PAGE_SIZE, confirmedPage * PAGE_SIZE).map((appt) => {
              const isCompleting = completeMutation.isPending && completeMutation.variables === appt.id
              return (
                <Card key={appt.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Patient #{appt.patient_user_id}</CardTitle>
                    <StatusBadge status={appt.status} />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <span>Date: {format(toNaiveDate(appt.appointment_datetime), 'PPpp')}</span>
                    {appt.description && <span className="text-muted-foreground">Note: {appt.description}</span>}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="default"
                        disabled={isCompleting}
                        onClick={async () => {
                          if (appt.status !== 'CONFIRMED') return
                          try {
                            await completeMutation.mutateAsync(appt.id)
                            toast.success('Appointment completed')
                          } catch (err: any) {
                            toast.error(err?.message || 'Failed to complete')
                          }
                        }}
                      >
                        {isCompleting ? 'Completing...' : 'Complete'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            <Pagination total={confirmed.length} page={confirmedPage} onPageChange={setConfirmedPage} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
