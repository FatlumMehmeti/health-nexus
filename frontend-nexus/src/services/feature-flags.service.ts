import { apiFetch } from '@/lib/api-client';

const BASE = '/api/superadmin/feature-flags';

export interface FeatureFlagRecord {
  id: number;
  tenant_id: number | null;
  feature_key: string;
  enabled: boolean;
  plan_tier: string | null;
}

export interface PlanDefaultPayload {
  plan_tier: string;
  feature_key: string;
  enabled: boolean;
}

export interface TenantOverridePayload {
  tenant_id: number;
  feature_key: string;
  enabled: boolean;
}

export const featureFlagsService = {
  list: () =>
    apiFetch<FeatureFlagRecord[]>(BASE, {
      method: 'GET',
    }),

  upsertPlanDefault: (payload: PlanDefaultPayload) =>
    apiFetch<FeatureFlagRecord>(`${BASE}/defaults`, {
      method: 'POST',
      body: payload,
    }),

  upsertTenantOverride: (payload: TenantOverridePayload) =>
    apiFetch<FeatureFlagRecord>(`${BASE}/overrides`, {
      method: 'POST',
      body: payload,
    }),

  resetToSeed: () =>
    apiFetch<FeatureFlagRecord[]>(`${BASE}/reset`, {
      method: 'POST',
    }),
};
