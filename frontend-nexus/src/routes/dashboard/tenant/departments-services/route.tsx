import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";
import { TenantDepartmentsManager } from "./index";
import { useAuthStore } from "@/stores/auth.store";

export const Route = createFileRoute("/dashboard/tenant/departments-services")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_TENANT" }),
  component: Department,
});

function Department() {
  const tenantId = useAuthStore((state) => state.tenantId);
  if (!tenantId) return null;
  return <TenantDepartmentsManager />;
}
