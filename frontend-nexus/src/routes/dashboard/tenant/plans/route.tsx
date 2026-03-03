import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";
import { TenantPlansPanel } from "./index";

export const Route = createFileRoute("/dashboard/tenant/plans")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_TENANT" }),
  component: TenantPlansPanel,
});
