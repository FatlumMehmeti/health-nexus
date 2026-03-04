import { requireAuth } from '@/lib/guards/requireAuth';
import {
  Outlet,
  createFileRoute,
} from '@tanstack/react-router';

export const Route = createFileRoute(
  '/dashboard/tenant/contracts'
)({
  beforeLoad: requireAuth({
    routeKey: 'DASHBOARD_TENANT',
  }),
  component: ContractsLayout,
});

function ContractsLayout() {
  return <Outlet />;
}
