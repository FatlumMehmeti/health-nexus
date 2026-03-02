import { useEffect, useState } from "react";
import { IconX, IconCheck } from "@tabler/icons-react";
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
import { Button } from "@/components/ui/button";

interface SubscriptionPlansModalProps {
  onClose: () => void;
}

/**
 * SubscriptionPlansModal Component
 * Displays all available subscription plans and highlights the user's current plan.
 * Users can see which plan they're subscribed to and explore upgrade/downgrade options.
 */
export function SubscriptionPlansModal({
  onClose,
}: SubscriptionPlansModalProps) {
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
                  }
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
                      }
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

/**
 * PlanCard Component
 * Individual plan card displaying pricing, features, and action button.
 * Shows "CURRENT PLAN" badge for user's active subscription with disabled state.
 * Shows "RECOMMENDED" badge for plans that fit current resource usage.
 * Shows availability status based on whether plan can accommodate current stats.
 */
function PlanCard({
  plan,
  isCurrentPlan = false,
  isRecommended = false,
  canFitStats = true,
  onChangePlan,
  isChanging = false,
}: {
  plan: SubscriptionPlan;
  isCurrentPlan?: boolean;
  isRecommended?: boolean;
  canFitStats?: boolean;
  onChangePlan?: (planId: number) => void;
  isChanging?: boolean;
}) {
  const price = parseFloat(plan.price);

  return (
    <div
      className={`relative rounded-lg border flex flex-col h-full min-h-[400px] transition-all group ${
        isCurrentPlan
          ? "dark:border-green-500/50 dark:bg-green-950/20 dark:shadow-lg dark:shadow-green-500/20 border-green-300 bg-green-100 shadow-lg shadow-green-200/50 cursor-not-allowed"
          : isRecommended
            ? "dark:border-blue-500 dark:bg-blue-950/20 border-blue-300 bg-blue-50 light:dark:text-gray-900"
            : !canFitStats
              ? "dark:border-red-500/30 dark:bg-red-950/10 border-red-200 bg-red-50/50 opacity-75"
              : "dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600 border-gray-300 bg-white hover:border-gray-400 light:dark:text-gray-900"
      }`}
      style={
        isCurrentPlan
          ? {
              padding: "2rem",
              boxShadow:
                "inset 0 1px 3px rgba(34, 197, 94, 0.1), 0 20px 25px -5px rgba(34, 197, 94, 0.1)",
            }
          : { padding: "1.5rem" }
      }
    >
      {/* Badge for current plan - shows when user already has this subscription */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 dark:bg-green-600 dark:text-white bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
          CURRENT PLAN
        </div>
      )}

      {/* Badge for recommended plan - shows for plans that fit current stats */}
      {isRecommended && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 dark:bg-blue-600 dark:text-white bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
          RECOMMENDED
        </div>
      )}

      {/* Badge for unavailable plan - shows when plan can't fit current stats */}
      {!canFitStats && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 dark:bg-red-600 dark:text-white bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
          TOO SMALL
        </div>
      )}

      {/* Plan name and pricing section */}
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2 dark:text-white text-gray-900">
          {plan.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold dark:text-white text-gray-900">
            ${price.toFixed(2)}
          </span>
          <span className="text-sm dark:text-zinc-400 text-gray-600">
            /month
          </span>
        </div>
      </div>

      {/* Features list with checkmarks */}
      <div className="space-y-4 flex-1">
        <div className="space-y-3 text-sm">
          {/* Display max doctors if available */}
          {plan.max_doctors && (
            <div className="flex items-start gap-3">
              <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="dark:text-gray-300 text-gray-700">
                {plan.max_doctors} doctors
              </span>
            </div>
          )}

          {/* Display max patients if available */}
          {plan.max_patients && (
            <div className="flex items-start gap-3">
              <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="dark:text-gray-300 text-gray-700">
                {plan.max_patients} patients
              </span>
            </div>
          )}

          {/* Display max departments if available */}
          {plan.max_departments && (
            <div className="flex items-start gap-3">
              <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="dark:text-gray-300 text-gray-700">
                {plan.max_departments} departments
              </span>
            </div>
          )}

          {/* Display billing cycle duration */}
          <div className="flex items-start gap-3">
            <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="dark:text-gray-300 text-gray-700">
              {plan.duration} days billing cycle
            </span>
          </div>
        </div>
      </div>

      {/* Action button - disabled if this is the current plan or too small */}
      <Button
        disabled={isCurrentPlan || isChanging || !canFitStats}
        onClick={() => onChangePlan?.(plan.id)}
        className={`w-full mt-6 ${
          isCurrentPlan
            ? "dark:bg-zinc-600 dark:hover:bg-zinc-600 dark:text-white dark:cursor-not-allowed dark:opacity-60 bg-gray-300 hover:bg-gray-300 text-gray-600 cursor-not-allowed opacity-60"
            : !canFitStats
              ? "dark:bg-red-900 dark:hover:bg-red-900 dark:text-white dark:cursor-not-allowed dark:opacity-60 bg-red-200 hover:bg-red-200 text-red-700 cursor-not-allowed opacity-60"
              : isRecommended
                ? "dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white bg-blue-500 hover:bg-blue-600 text-white"
                : "dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white bg-gray-800 hover:bg-gray-900 text-white"
        }`}
        title={
          !canFitStats ? "Plan is too small for your current usage" : undefined
        }
      >
        {isCurrentPlan
          ? "Current Plan"
          : !canFitStats
            ? "Plan Too Small"
            : isChanging
              ? "Updating..."
              : price === 0
                ? "Get Started"
                : "Choose Plan"}
      </Button>
    </div>
  );
}
