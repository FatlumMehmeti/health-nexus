import { requireAuth } from '@/lib/guards/requireAuth';
import { enrollmentsService } from '@/services/enrollments.service';
import { useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const Route = createFileRoute('/dashboard/client')({
  beforeLoad: requireAuth({
    routeKey: 'DASHBOARD_CLIENTS',
  }),
  component: ClientPage,
});

/* -------------------------------------------------------------------------- */
/* Section handling                                                            */
/* -------------------------------------------------------------------------- */

export const CLIENT_SECTION_KEYS = [
  'profile',
  'enrollments',
  'settings',
] as const;

export type ClientSectionKey =
  (typeof CLIENT_SECTION_KEYS)[number];

export function normalizeClientSection(
  rawSection: string | null | undefined
): ClientSectionKey {
  const section = (rawSection ?? '').trim();
  if (
    (CLIENT_SECTION_KEYS as readonly string[]).includes(
      section
    )
  ) {
    return section as ClientSectionKey;
  }
  return 'profile';
}

/* -------------------------------------------------------------------------- */
/* Root route wrapper                                                          */
/* -------------------------------------------------------------------------- */

function ClientPage() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  if (pathname !== '/dashboard/client') {
    return <Outlet />;
  }

  return <ClientPageContent activeSection="profile" />;
}

/* -------------------------------------------------------------------------- */
/* Shared content                                                              */
/* -------------------------------------------------------------------------- */

export function ClientPageContent({
  activeSection,
}: {
  activeSection: ClientSectionKey;
}) {
  const enrollmentsQuery = useQuery({
    queryKey: ['client-manager', 'my-enrollments'],
    queryFn: () => enrollmentsService.listMyEnrollments(),
    enabled: activeSection === 'enrollments',
  });

  const isLoading = enrollmentsQuery.isLoading;
  const isError = enrollmentsQuery.isError;
  const error = enrollmentsQuery.error;
  const enrollments = enrollmentsQuery.data ?? [];

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Client Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your enrollments and account settings.
        </p>
      </div>

      {/* ----------------------- Profile SECTION -----------------------
          {activeSection === "profile" && (
              <Card>
                  <CardHeader>
                      <CardTitle>Profile</CardTitle>
                      <CardDescription>
                          Manage your client account profile.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>Profile content goes here.</CardContent>
              </Card>)} */}

      {/* ----------------------- ENROLLMENTS SECTION ----------------------- */}

      {activeSection === 'enrollments' && (
        <Card>
          <CardHeader>
            <CardTitle>My Enrollments</CardTitle>
            <CardDescription>
              A list of all your enrollments across tenants.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-16 w-full"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="py-8 text-center text-destructive">
                Error loading enrollments:{' '}
                {(error as Error)?.message ||
                  'Unknown error'}
              </div>
            ) : enrollments.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                You currently have no enrollments.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tenant Plan</TableHead>
                      <TableHead>Activated</TableHead>
                      <TableHead>
                        Expires / Cancelled
                      </TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {enrollments.map((enrollment: any) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">
                          {enrollment.id}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={getEnrollmentStatusVariant(
                              enrollment.status
                            )}
                          >
                            {enrollment.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm">
                          {enrollment.user_tenant_plan_id}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(
                            enrollment.activated_at
                          )}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm">
                          {enrollment.status === 'CANCELLED'
                            ? formatDate(
                                enrollment.cancelled_at
                              )
                            : formatDate(
                                enrollment.expires_at
                              )}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(
                            enrollment.updated_at
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------- SETTINGS SECTION ------------------------ */}

      {activeSection === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Manage your client account preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            Settings content goes here.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function formatDate(dateString: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEnrollmentStatusVariant(
  status: string
):
  | 'success'
  | 'warning'
  | 'destructive'
  | 'expired'
  | 'default' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'CANCELLED':
      return 'destructive';
    case 'EXPIRED':
      return 'expired';
    default:
      return 'default';
  }
}
