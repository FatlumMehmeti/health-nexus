import { apiFetch } from "@/lib/api-client";

const BASE = "/api/subscription_plan";

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: string;
  duration: number;
  max_doctors: number | null;
  max_patients: number | null;
  max_departments: number | null;
}

export interface TenantSubscription {
  id: number;
  tenant_id: number;
  subscription_plan_id: number;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  activated_at: string;
  expires_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface SubscriptionStats {
  doctors_used: number;
  patients_used: number;
  departments_used: number;
  current_plan_id: number;
  current_plan_name: string;
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return apiFetch(`${BASE}/`, {
    method: "GET",
  });
}

export async function getCurrentSubscription(): Promise<TenantSubscription> {
  return apiFetch(`${BASE}/current`, {
    method: "GET",
  });
}

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  return apiFetch(`${BASE}/stats`, {
    method: "GET",
  });
}

export async function changePlan(
  newPlanId: number,
): Promise<TenantSubscription> {
  return apiFetch(`${BASE}/change`, {
    method: "POST",
    body: { new_plan_id: newPlanId },
  });
}
