import { Outlet, createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";

export const Route = createFileRoute("/dashboard/tenant")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_TENANT" }),
  component: () => <Outlet />,
});
