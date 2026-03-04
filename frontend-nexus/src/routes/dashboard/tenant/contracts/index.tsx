import { ContractsPage } from '@/components/contracts/ContractsPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/dashboard/tenant/contracts/'
)({
  component: ContractsIndexRoute,
});

function ContractsIndexRoute() {
  return <ContractsPage />;
}
