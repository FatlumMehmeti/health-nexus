import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";
import {
  normalizeClientSection,
  ClientPageContent,
} from "@/routes/dashboard/client";

export const Route = createFileRoute(
  "/dashboard/client/$section",
)({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_CLIENTS" }),
  component: ClientSectionPage,
});

function ClientSectionPage() {
  const { section } = Route.useParams();

  return (
    <ClientPageContent
      activeSection={normalizeClientSection(section)}
    />
  );
}