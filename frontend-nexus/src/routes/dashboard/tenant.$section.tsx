import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";
import {
  normalizeTenantSection,
  TenantManagerPageContent,
} from "@/routes/dashboard/tenant";

export const Route = createFileRoute("/dashboard/tenant/$section")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_TENANT" }),
  component: TenantManagerSectionPage,
});

function TenantManagerSectionPage() {
  const { section } = Route.useParams();
  return <TenantManagerPageContent activeSection={normalizeTenantSection(section)} />;
}
