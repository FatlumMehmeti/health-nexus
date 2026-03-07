import { ChartAreaInteractive } from '@/components/molecules/chart-area-interactive';
import { DataTable, schema } from '@/components/molecules/data-table';
import { FeatureUnavailableCard } from '@/components/molecules/feature-unavailable-card';
import { SectionCards } from '@/components/molecules/section-cards';
import { TenantFeatureGuard } from '@/components/TenantFeatureGuard';
import { IconSparkles } from '@tabler/icons-react';
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
      <TenantFeatureGuard
        featureKey="ai_insights"
        fallback={
          <FeatureUnavailableCard
            title="AI Insights"
            description="AI Insights is not available on your current plan."
            featureLabel="ai_insights"
            icon={IconSparkles}
            showCurrentPlan
          />
        }
      >
        <SectionCards />
        <ChartAreaInteractive />
        <DataTable data={data} />
      </TenantFeatureGuard>
    </div>
  );
}
