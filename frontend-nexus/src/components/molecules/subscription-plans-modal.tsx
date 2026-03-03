import { useEffect, useState } from "react";
import {
  getSubscriptionPlans,
  getCurrentSubscription,
  getSubscriptionStats,
  changePlan,
  type SubscriptionPlan,
  type TenantSubscription,
  type SubscriptionStats,
} from "@/services/subscription-plans.service";
import { isApiError } from "@/lib/api-client";
import { PlanCard } from "@/components/molecules/plan-card";

interface SubscriptionPlansModalProps {
  onClose: () => void;
}

/**
 * SubscriptionPlansModal Component
 * Displays all available subscription plans and highlights the user's current plan.
 * Users can see which plan they're subscribed to and explore upgrade/downgrade options.
 */
export function SubscriptionPlansModal({}: SubscriptionPlansModalProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<TenantSubscription | null>(null);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingPlanId, setChangingPlanId] = useState<number | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);

  // Helper: Check if a plan can accommodate current stats
  const canPlanFitStats = (plan: SubscriptionPlan): boolean => {
    if (!stats) return true;

    const docsFit =
      plan.max_doctors === null || stats.doctors_used <= plan.max_doctors;
    const patientsFit =
      plan.max_patients === null || stats.patients_used <= plan.max_patients;
    const deptsFit =
      plan.max_departments === null ||
      stats.departments_used <= plan.max_departments;

    return docsFit && patientsFit && deptsFit;
  };

  // Helper: Find the recommended plan (smallest plan that fits current stats)
  const getRecommendedPlanId = (): number | null => {
    if (!stats) return null;

    // Filter plans that can fit the stats, then sort by total capacity and pick the smallest
    const fittingPlans = plans.filter(canPlanFitStats);
    if (fittingPlans.length === 0) return null;

    // Return the first fitting plan (they're already ordered from smallest to largest in the DB)
    return fittingPlans[0].id;
  };

  // Fetch both subscription plans and current subscription on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          getSubscriptionPlans(),
          getCurrentSubscription(),
          getSubscriptionStats(),
        ]);
        const plansData =
          results[0].status === "fulfilled" ? results[0].value : [];
        const currentSub =
          results[1].status === "fulfilled" ? results[1].value : null;
        const statsData =
          results[2].status === "fulfilled" ? results[2].value : null;
        setPlans(plansData);
        setCurrentSubscription(currentSub);
        setStats(statsData);
      } catch (err) {
        let message = "Failed to load plans";
        if (isApiError(err)) {
          message = err.displayMessage;
        } else if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChangePlan = async (planId: number) => {
    try {
      setChangingPlanId(planId);
      setChangeError(null);
      await changePlan(planId);
      // Refresh the current subscription
      const updated = await getCurrentSubscription();
      setCurrentSubscription(updated);
    } catch (err) {
      let message = "Failed to change plan";
      if (isApiError(err)) {
        message = err.displayMessage;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setChangeError(message);
    } finally {
      setChangingPlanId(null);
    }
  };

  // Show loading state while fetching data
  if (loading) {
    return (
      <div className="w-full">
        <div className="text-center py-12">Loading plans...</div>
      </div>
    );
  }

  // Show error state if data fetch fails
  if (error) {
    return (
      <div className="w-full">
        <div className="text-center py-12 text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 py-6">
      {/* Title */}
      <h1 className="text-4xl font-bold text-center mb-4 dark:text-white text-gray-900">
        Choose Your Health Nexus Plan
      </h1>

      {/* Thin stats summary line */}
      {stats && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Currently registered:{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {stats.doctors_used} doctor{stats.doctors_used !== 1 ? "s" : ""}
          </span>
          ,{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {stats.patients_used} patient{stats.patients_used !== 1 ? "s" : ""}
          </span>
          , and{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {stats.departments_used} department
            {stats.departments_used !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Billing cycle dates for current subscription */}
      {currentSubscription && currentSubscription.activated_at && (
        <div className="mx-auto max-w-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Activated
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {new Date(currentSubscription.activated_at).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  },
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Expires
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {currentSubscription.expires_at
                  ? new Date(currentSubscription.expires_at).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Show error message if plan change fails */}
      {changeError && (
        <div className="mx-auto max-w-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4 text-red-700 dark:text-red-200 text-sm">
          <p className="font-semibold mb-1">Unable to change plan</p>
          <p>{changeError}</p>
        </div>
      )}

      {/* Grid layout: 1 column on mobile, 2 on tablet, 4 on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {plans.map((plan) => {
          const recommendedPlanId = getRecommendedPlanId();
          const isRecommended = plan.id === recommendedPlanId;
          const canFit = canPlanFitStats(plan);

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              // Check if this plan is the user's current subscription
              isCurrentPlan={
                plan.id === currentSubscription?.subscription_plan_id
              }
              isRecommended={isRecommended}
              canFitStats={canFit}
              onChangePlan={handleChangePlan}
              isChanging={changingPlanId === plan.id}
            />
          );
        })}
      </div>
    </div>
  );
}
