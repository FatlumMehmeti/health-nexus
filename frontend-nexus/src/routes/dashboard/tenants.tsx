import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { tenantsService } from "@/services/tenants.service";
import { TenantStatus } from "@/interfaces";
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

export const Route = createFileRoute("/dashboard/tenants")({
  component: TenantsPage,
});

const STATUS_TABS = [
  { value: TenantStatus.PENDING, label: "Pending" },
  { value: TenantStatus.APPROVED, label: "Approved" },
  { value: TenantStatus.REJECTED, label: "Rejected" },
  { value: TenantStatus.SUSPENDED, label: "Suspended" },
  { value: TenantStatus.ARCHIVED, label: "Archived" },
] as const;

function TenantsPage() {
  const [activeStatus, setActiveStatus] = useState<TenantStatus>(
    TenantStatus.PENDING
  );

  const { data: tenants = [], isLoading, isError, error } = useQuery({
    queryKey: ["tenants", activeStatus],
    queryFn: () => tenantsService.list({ status: activeStatus }),
  });

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
        return "default";
      case TenantStatus.PENDING:
        return "secondary";
      case TenantStatus.REJECTED:
        return "destructive";
      case TenantStatus.SUSPENDED:
        return "outline";
      case TenantStatus.ARCHIVED:
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Tenant Management</h1>
        <p className="mt-2 text-muted-foreground">
          Manage tenant applications and subscriptions
        </p>
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
                    Error loading tenants: {(error as Error)?.message || "Unknown error"}
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
                              <Badge variant={getStatusBadgeVariant(tenant.status)}>
                                {tenant.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDate(tenant.created_at)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDate(tenant.updated_at)}
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
