import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { tenantsService } from "@/services/tenants.service";
import { TenantStatus, type TenantRead } from "@/interfaces";
import {
  STATUS_TABS,
  STATUS_ACTIONS,
  ICON_SIZE,
  TENANTS_QUERY_KEY,
} from "@/routes/dashboard/tenants/constants";
import { TenantForm } from "@/routes/dashboard/tenants/tenant-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ActionsDropdown,
  type ActionItem,
} from "@/components/molecules/actions-dropdown";
import { toast } from "sonner";
import { useDialogStore } from "@/stores/use-dialog-store";
import { isApiError } from "@/lib/api-client";

export const Route = createFileRoute("/dashboard/tenants")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_TENANTS" }),
  component: TenantsPage,
});

function TenantsPage() {
  const queryClient = useQueryClient();
  const dialog = useDialogStore();
  const [activeStatus, setActiveStatus] = useState<TenantStatus>(
    TenantStatus.PENDING,
  );

  const {
    data: tenants = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...TENANTS_QUERY_KEY, activeStatus],
    queryFn: () => tenantsService.list({ status: activeStatus }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      tenantId,
      status,
    }: {
      tenantId: number;
      status: TenantStatus;
    }) => tenantsService.updateStatus(tenantId, status),
    onSuccess: (data) => {
      toast.success("Status updated", {
        description: `"${data.name}" has been ${data.status.toLowerCase()}.`,
      });
      queryClient.invalidateQueries({ queryKey: TENANTS_QUERY_KEY });
      dialog.close();
    },
    onError: (err) => {
      toast.error("Failed to update status", {
        description: isApiError(err)
          ? err.displayMessage
          : (err as Error).message,
      });
    },
  });

  const getTenantActions = (tenant: TenantRead): ActionItem[] => {
    const openConfirmDialog = (status: TenantStatus, label: string, isDestructive: boolean) => {
      const doUpdate = () =>
        updateStatusMutation.mutate({ tenantId: tenant.id, status });

      dialog.open({
        title: `${label} tenant`,
        content: (
          <p className="text-muted-foreground">
            Are you sure you want to {label.toLowerCase()} &quot;
            {tenant.name}&quot;?
          </p>
        ),
        footer: (
          <>
            <Button variant="outline" onClick={dialog.close}>
              Cancel
            </Button>
            <Button
              variant={isDestructive ? "destructive" : "default"}
              onClick={doUpdate}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Processing..." : label}
            </Button>
          </>
        ),
      });
    };

    return (STATUS_ACTIONS[tenant.status] ?? []).map(
      ({ target, label, Icon, variant }) => ({
        label,
        icon: <Icon {...ICON_SIZE} />,
        onClick: () => openConfirmDialog(target, label, variant === "destructive"),
        variant,
        separatorBefore: true,
      }),
    );
  };

  const openCreateDialog = () => {
    dialog.open({
      title: "Create tenant",
      content: <TenantForm />,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeVariant = (status: TenantStatus) => {
    switch (status) {
      case TenantStatus.APPROVED:
        return "success";
      case TenantStatus.PENDING:
        return "warning";
      case TenantStatus.REJECTED:
        return "destructive";
      case TenantStatus.SUSPENDED:
        return "destructive";
      case TenantStatus.ARCHIVED:
        return "neutral";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="mt-2 text-muted-foreground">
            Manage tenant applications and subscriptions
          </p>
        </div>
        <Button onClick={openCreateDialog}>Create tenant</Button>
      </div>

      <Tabs
        value={activeStatus}
        onValueChange={(value) => setActiveStatus(value as TenantStatus)}
      >
        <TabsList variant="line">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{tab.label} Tenants</CardTitle>
                <CardDescription>
                  {isLoading
                    ? "Loading..."
                    : `${tenants.length} tenant${tenants.length !== 1 ? "s" : ""} found`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : isError ? (
                  <div className="py-8 text-center text-destructive">
                    Error loading tenants:{" "}
                    {(error as Error)?.message || "Unknown error"}
                  </div>
                ) : tenants.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No {tab.label.toLowerCase()} tenants found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Licence</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="w-0" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenants.map((tenant) => (
                          <TableRow key={tenant.id}>
                            <TableCell className="font-medium">
                              {tenant.id}
                            </TableCell>
                            <TableCell>{tenant.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {tenant.email}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {tenant.licence_number}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusBadgeVariant(tenant.status)}
                              >
                                {tenant.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDate(tenant.created_at)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDate(tenant.updated_at)}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const actions = getTenantActions(tenant);
                                return actions.length > 0 ? (
                                  <div className="flex justify-end">
                                    <ActionsDropdown
                                      actions={actions}
                                      trigger="icon"
                                      align="end"
                                    />
                                  </div>
                                ) : null;
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
