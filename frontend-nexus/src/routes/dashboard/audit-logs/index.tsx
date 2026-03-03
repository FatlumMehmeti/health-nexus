import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/guards/requireAuth";
import { useQuery } from "@tanstack/react-query";
import { auditLogsService } from "@/services/audit-logs.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/audit-logs/")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_AUDIT_LOGS" }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const {
    data: logs = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: auditLogsService.list,
  });

  const getEventBadge = (event: string) => {
    switch (event) {
      case "STATUS_CHANGE":
        return "warning";
      case "CREATION":
        return "success";
      case "DELETION":
        return "destructive";
      default:
        return "neutral";
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          Track all tenant lifecycle changes across the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Activity History</CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center text-destructive py-10">
              Failed to load audit logs
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.id}</TableCell>

                      <TableCell>
                        <Badge variant={getEventBadge(log.event_type)}>
                          {log.event_type}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium capitalize">
                          {log.entity_name}
                        </div>
                        {log.entity_id && (
                          <span className="text-xs text-muted-foreground">
                            #{log.entity_id}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-sm">
                        <div className="space-y-2">
                          {log.old_value && (
                            <div className="rounded-lg border p-2 bg-muted/40">
                              <div className="text-xs font-semibold text-muted-foreground mb-1">
                                Old Status
                              </div>

                              <div className="text-sm font-mono">
                                {typeof log.old_value === "object"
                                  ? JSON.stringify(log.old_value, null, 2)
                                  : log.old_value}
                              </div>
                            </div>
                          )}

                          {log.new_value && (
                            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                              <div className="text-xs font-semibold text-primary mb-1">
                                New Status
                              </div>

                              <div className="text-sm font-semibold text-foreground">
                                {typeof log.new_value === "object"
                                  ? JSON.stringify(log.new_value, null, 2)
                                  : log.new_value}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm">
                        {log.performed_by_role && (
                          <Badge variant="outline">
                            {log.performed_by_role}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                        {log.reason || "-"}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
