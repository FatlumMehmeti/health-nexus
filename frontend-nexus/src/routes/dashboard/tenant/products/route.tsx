import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";
import { ProductsManager } from "./index";

export const Route = createFileRoute("/dashboard/tenant/products")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_TENANT" }),
  component: ProductsManager,
});
