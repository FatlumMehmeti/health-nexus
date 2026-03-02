import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";
import {
  TenantManagerPageContent,
  normalizeTenantSection,
} from "@/routes/dashboard/tenant/index";

export const Route = createFileRoute("/dashboard/tenant")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_TENANT" }),
  component: TenantManagerPage,
});

function TenantManagerPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/dashboard/tenant") {
    return <Outlet />;
  }
  return <TenantManagerPageContent activeSection="departments-services" />;
}

export { TenantManagerPageContent, normalizeTenantSection };
