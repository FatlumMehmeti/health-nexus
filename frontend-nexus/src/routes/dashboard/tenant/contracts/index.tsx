import { createFileRoute } from "@tanstack/react-router";
import { ContractsPage } from "@/components/contracts/ContractsPage";

export const Route = createFileRoute("/dashboard/tenant/contracts/")({
  component: ContractsIndexRoute,
});

function ContractsIndexRoute() {
  return <ContractsPage />;
}
