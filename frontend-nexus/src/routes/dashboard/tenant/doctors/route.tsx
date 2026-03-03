import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";
import { useAuthStore } from "@/stores/auth.store";
import { DoctorsManager } from "./index";

export const Route = createFileRoute("/dashboard/tenant/doctors")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_TENANT" }),
  component: DoctorsPage,
});

function DoctorsPage() {
  const tenantId = useAuthStore((state) => state.tenantId);
  if (!tenantId) return null;
  return <DoctorsManager tenantId={Number(tenantId)} />;
}
