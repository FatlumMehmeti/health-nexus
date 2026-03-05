import { ChartAreaInteractive } from '@/components/molecules/chart-area-interactive';
import { DataTable, schema } from '@/components/molecules/data-table';
import { SectionCards } from '@/components/molecules/section-cards';
import dashboardData from '@/lib/dashboard-data.json';
import { requireAuth } from '@/lib/guards/requireAuth';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: requireAuth({
    routeKey: 'DASHBOARD_HOME',
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const data = z.array(schema).parse(dashboardData);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 ">
      <SectionCards />
      <ChartAreaInteractive />
      <DataTable data={data} />
    </div>
  );
}
