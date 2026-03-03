import { apiFetch } from "@/lib/api-client";

const BASE = "/api/subscription_plan";

/**
 * Represents a subscription plan available in Health Nexus
 */
export interface SubscriptionPlan {
  id: number;
  name: string;
  price: string;
  duration: number; // in days
  max_doctors: number | null;
  max_patients: number | null;
  max_departments: number | null;
}

/**
 * Represents a tenant's current subscription
 */
export interface TenantSubscription {
  id: number;
  tenant_id: number;
  subscription_plan_id: number;
  status: "ACTIVE" | "EXPIRED";
  activated_at: string;
  expires_at: string;
  cancelled_at: string | null; // When subscription was cancelled by tenant
  cancellation_reason: string | null;
}

/**
 * Statistics about a tenant's resource usage
 */
export interface SubscriptionStats {
  doctors_used: number;
  patients_used: number;
  departments_used: number;
  current_plan_id: number;
  current_plan_name: string;
}

/**
 * Fetch all available subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return apiFetch(`${BASE}/`, {
    method: "GET",
  });
}

/**
 * Get the tenant's currently active subscription
 */
export async function getCurrentSubscription(): Promise<TenantSubscription> {
  return apiFetch(`${BASE}/current`, {
    method: "GET",
  });
}

/**
 * Get the tenant's current resource usage stats
 */
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  return apiFetch(`${BASE}/stats`, {
    method: "GET",
  });
}

/**
 * Change tenant's subscription plan
 */
export async function changePlan(
  newPlanId: number,
): Promise<TenantSubscription> {
  return apiFetch(`${BASE}/change`, {
    method: "POST",
    body: { new_plan_id: newPlanId },
  });
}
