import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { isApiError } from '@/lib/api-client';
import {
  featureFlagsService,
  type FeatureFlagRecord,
} from '@/services/feature-flags.service';
import {
  IconChevronDown,
  IconLockAccess,
  IconRefresh,
  IconSettingsCheck,
} from '@tabler/icons-react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const FEATURE_FLAGS_QUERY_KEY = ['permissions', 'feature-flags'];

export function PermissionsFeatureFlagsPanel() {
  const queryClient = useQueryClient();
  const [openPlans, setOpenPlans] = useState<Record<string, boolean>>(
    {}
  );

  const {
    data: flags = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: FEATURE_FLAGS_QUERY_KEY,
    queryFn: () => featureFlagsService.list(),
  });

  const groupedByPlan = useMemo(() => {
    const grouped = new Map<string, FeatureFlagRecord[]>();
    for (const row of flags) {
      const groupKey =
        row.tenant_id !== null
          ? `tenant:${row.tenant_id}`
          : `plan:${row.plan_tier ?? 'unknown'}`;
      const existing = grouped.get(groupKey) ?? [];
      existing.push(row);
      grouped.set(groupKey, existing);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupKey, rows]) => ({
        groupKey,
        groupLabel: groupKey.startsWith('tenant:')
          ? `Tenant #${groupKey.replace('tenant:', '')}`
          : `Plan ${groupKey.replace('plan:', '')}`,
        rows: rows.sort((a, b) => {
          return a.feature_key.localeCompare(b.feature_key);
        }),
      }));
  }, [flags]);

  const toTitleCase = (value: string) =>
    value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const getScopeLabel = (row: FeatureFlagRecord): string =>
    row.tenant_id !== null
      ? `Tenant #${row.tenant_id}`
      : `Plan ${row.plan_tier ?? 'unknown'}`;

  const togglePlan = (groupKey: string) => {
    setOpenPlans((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const updateMutation = useMutation({
    mutationFn: ({
      row,
      nextEnabled,
    }: {
      row: FeatureFlagRecord;
      nextEnabled: boolean;
    }) => {
      if (row.tenant_id !== null) {
        return featureFlagsService.upsertTenantOverride({
          tenant_id: row.tenant_id,
          feature_key: row.feature_key,
          enabled: nextEnabled,
        });
      }

      if (!row.plan_tier) {
        throw new Error(
          'Cannot update plan default without plan tier'
        );
      }

      return featureFlagsService.upsertPlanDefault({
        plan_tier: row.plan_tier,
        feature_key: row.feature_key,
        enabled: nextEnabled,
      });
    },
    onMutate: async ({ row, nextEnabled }) => {
      await queryClient.cancelQueries({
        queryKey: FEATURE_FLAGS_QUERY_KEY,
      });
      const previousFlags =
        queryClient.getQueryData<FeatureFlagRecord[]>(
          FEATURE_FLAGS_QUERY_KEY
        ) ?? [];

      queryClient.setQueryData<FeatureFlagRecord[]>(
        FEATURE_FLAGS_QUERY_KEY,
        (current = []) =>
          current.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  enabled: nextEnabled,
                }
              : item
          )
      );

      return { previousFlags };
    },
    onSuccess: (_data, variables) => {
      const featureName = toTitleCase(variables.row.feature_key);
      const scope = getScopeLabel(variables.row);
      toast.success(
        `${featureName} (${scope}): Turned ${
          variables.nextEnabled ? 'On' : 'Off'
        }`
      );
    },
    onError: (mutationError, _vars, context) => {
      if (context?.previousFlags) {
        queryClient.setQueryData(
          FEATURE_FLAGS_QUERY_KEY,
          context.previousFlags
        );
      }
      toast.error('Failed to update feature flag', {
        description: isApiError(mutationError)
          ? mutationError.displayMessage
          : 'Unknown error while saving changes',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: FEATURE_FLAGS_QUERY_KEY,
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => featureFlagsService.resetToSeed(),
    onSuccess: (seedFlags) => {
      queryClient.setQueryData(FEATURE_FLAGS_QUERY_KEY, seedFlags);
      toast.success('Reset to initial values complete');
      void queryClient.invalidateQueries({
        queryKey: FEATURE_FLAGS_QUERY_KEY,
      });
    },
    onError: (err) => {
      toast.error('Failed to reset to initial values', {
        description: isApiError(err)
          ? err.displayMessage
          : 'Unknown error while resetting',
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Toggle plan defaults and tenant overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription className="text-destructive">
            {isApiError(error)
              ? error.displayMessage
              : 'Failed to load feature flags'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <IconSettingsCheck className="size-5" />
            Feature Flags
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetMutation.mutate()}
            disabled={
              resetMutation.isPending ||
              isLoading ||
              updateMutation.isPending
            }
          >
            <IconRefresh className="size-4" />
            {resetMutation.isPending ? 'Resetting...' : 'Reset'}
          </Button>
        </div>
        <CardDescription>
          Grouped by plan. Expand each plan to manage its permissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {groupedByPlan.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No feature flags found.
          </p>
        ) : (
          groupedByPlan.map(({ groupKey, groupLabel, rows }) => {
            const isOpen = openPlans[groupKey] ?? true;
            return (
              <div
                key={groupKey}
                className="overflow-hidden rounded-lg border"
              >
                <Button
                  variant="ghost"
                  onClick={() => togglePlan(groupKey)}
                  className="flex h-auto w-full items-center justify-between rounded-none px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <IconLockAccess className="size-4 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium">
                        {toTitleCase(groupLabel)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {rows.length} permissions
                    </Badge>
                    <IconChevronDown
                      className={`size-4 transition-transform ${
                        isOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </div>
                </Button>

                {isOpen ? (
                  <div className="space-y-2 border-t bg-muted/20 p-3">
                    {rows.map((row) => {
                      const isPendingForRow =
                        updateMutation.isPending &&
                        updateMutation.variables?.row.id === row.id;
                      const toggleRow = (nextEnabled: boolean) =>
                        updateMutation.mutate({
                          row,
                          nextEnabled,
                        });

                      return (
                        <button
                          type="button"
                          key={row.id}
                          disabled={isPendingForRow}
                          onClick={() => toggleRow(!row.enabled)}
                          className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">
                              {toTitleCase(row.feature_key)}
                            </Badge>
                          </div>
                          <Switch
                            checked={row.enabled}
                            disabled={isPendingForRow}
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                            onCheckedChange={toggleRow}
                            aria-label={`Toggle ${row.feature_key}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
