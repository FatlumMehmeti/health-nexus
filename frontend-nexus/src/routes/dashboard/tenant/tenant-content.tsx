import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { TenantSectionKey } from './constants';
import { QUERY_KEYS } from './constants';
import { TenantDepartmentsManager } from './departments-manager';
import { TenantDetailsEditor } from './details-editor';
import { DoctorsManager } from './doctors-manager';
import { TenantEnrollmentsPanel } from './enrollments-panel';
import { TenantPlansPanel } from './plans-panel';
import { ProductsManager } from './products-manager';
import { InfoPill } from './shared';
import {
  getCurrentTenantWithFallback,
  getErrorMessage,
} from './utils';

interface TenantManagerPageContentProps {
  activeSection: TenantSectionKey;
}

export function TenantManagerPageContent({
  activeSection,
}: TenantManagerPageContentProps) {
  const queryClient = useQueryClient();
  const tenantIdFromStore = useAuthStore(
    (state) => state.tenantId
  );

  const currentTenantQuery = useQuery({
    queryKey: QUERY_KEYS.current,
    queryFn: () =>
      getCurrentTenantWithFallback(tenantIdFromStore),
  });

  const notifyDataChanged = () => {
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.details,
    });
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.departments,
    });
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.doctors,
    });
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products,
    });
  };

  if (currentTenantQuery.isLoading) {
    return (
      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (currentTenantQuery.isError) {
    return (
      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">
          My Tenant
        </h1>
        <Card>
          <CardContent className="pt-6 text-destructive">
            Failed to load tenant context:{' '}
            {getErrorMessage(currentTenantQuery.error)}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tenant = currentTenantQuery.data;
  if (!tenant) {
    return (
      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">
          My Tenant
        </h1>
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            No tenant context available.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">
          My Tenant
        </h1>
        <p className="text-muted-foreground">
          Manage branding, departments, services, products,
          plans, and enrollments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tenant.name}</CardTitle>
          <CardDescription>
            {tenant.slug
              ? `Public landing slug: ${tenant.slug}`
              : 'No public slug yet'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoPill
            label="Tenant ID"
            value={String(tenant.id)}
          />
          <InfoPill label="Email" value={tenant.email} />
          <InfoPill
            label="Licence"
            value={tenant.licence_number}
          />
          <InfoPill
            label="Status"
            value={
              tenant.status
                ? String(tenant.status)
                : 'unknown'
            }
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        {activeSection === 'departments-services' && (
          <TenantDepartmentsManager
            onSaved={notifyDataChanged}
          />
        )}

        {activeSection === 'doctors' && (
          <DoctorsManager
            tenantId={tenant.id}
            onSaved={notifyDataChanged}
          />
        )}

        {activeSection === 'products' && (
          <ProductsManager onSaved={notifyDataChanged} />
        )}

        {activeSection === 'plans' && <TenantPlansPanel />}

        {activeSection === 'enrollments' && (
          <TenantEnrollmentsPanel />
        )}

        {activeSection === 'settings' && (
          <TenantDetailsEditor
            onSaved={notifyDataChanged}
          />
        )}
      </div>
    </div>
  );
}
