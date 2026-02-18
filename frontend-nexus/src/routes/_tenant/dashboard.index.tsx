import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/data-table'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { SectionCards } from '@/components/section-cards'
import dashboardData from '@/lib/dashboard-data.json'
import { schema } from '@/components/data-table'
import { z } from 'zod'

export const Route = createFileRoute('/_tenant/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  const data = z.array(schema).parse(dashboardData)

  return (
    <div className="flex flex-1 flex-col gap-4">
      <SectionCards />
      <ChartAreaInteractive />
      <DataTable data={data} />
    </div>
  )
}
