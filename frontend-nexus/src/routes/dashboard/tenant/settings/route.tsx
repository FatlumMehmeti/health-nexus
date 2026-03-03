import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";
import { TenantDetailsEditor } from "./index";

export const Route = createFileRoute("/dashboard/tenant/settings")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_TENANT" }),
  component: TenantDetailsEditor,
});
