import { createFileRoute, redirect } from '@tanstack/react-router'
import { DataTable, schema } from '@/components/molecules/data-table'
import { ChartAreaInteractive } from '@/components/molecules/chart-area-interactive'
import { SectionCards } from '@/components/molecules/section-cards'
import dashboardData from '@/lib/dashboard-data.json'
import { canAccess } from '@/lib/rbacMatrix'
import { useAuthStore } from '@/stores/auth.store'
import { z } from 'zod'

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canAccess(role ?? undefined, 'DASHBOARD_HOME')) throw redirect({ to: '/unauthorized' })
  },
  component: DashboardPage,
})

function DashboardPage() {
  const data = z.array(schema).parse(dashboardData)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 ">
      <SectionCards />
      <ChartAreaInteractive />
      <DataTable data={data} />
    </div>
  )
}
