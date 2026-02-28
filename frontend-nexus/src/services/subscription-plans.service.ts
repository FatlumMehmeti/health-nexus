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

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return apiFetch(`${BASE}/`, {
    method: "GET",
  });
}
