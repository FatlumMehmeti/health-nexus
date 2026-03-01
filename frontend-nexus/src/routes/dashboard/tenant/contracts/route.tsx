import { Outlet, createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";

export const Route = createFileRoute("/dashboard/tenant/contracts")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_TENANT" }),
  component: ContractsLayout,
});

function ContractsLayout() {
  return <Outlet />;
}
