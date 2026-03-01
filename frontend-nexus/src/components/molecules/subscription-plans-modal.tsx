import { useEffect, useState } from "react";
import { IconX, IconCheck } from "@tabler/icons-react";
import {
  getSubscriptionPlans,
  getCurrentSubscription,
  type SubscriptionPlan,
  type TenantSubscription,
} from "@/services/subscription-plans.service";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch both subscription plans and current subscription on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          getSubscriptionPlans(),
          getCurrentSubscription(),
        ]);
        const plansData =
          results[0].status === "fulfilled" ? results[0].value : [];
        const currentSub =
          results[1].status === "fulfilled" ? results[1].value : null;
        setPlans(plansData);
        setCurrentSubscription(currentSub);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load plans");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
    <div className="w-full space-y-8 py-6">
      <h1 className="text-4xl font-bold text-center mb-12 dark:text-white text-gray-900">
        Choose Your Nexus Plan
      </h1>

      {/* Grid layout: 1 column on mobile, 2 on tablet, 4 on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            // Check if this plan is the user's current subscription
            isCurrentPlan={
              plan.id === currentSubscription?.subscription_plan_id
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * PlanCard Component
 * Individual plan card displaying pricing, features, and action button.
 * Shows "CURRENT PLAN" badge for user's active subscription with disabled state.
 * Shows "RECOMMENDED" badge for the Medium Clinic plan.
 */
function PlanCard({
  plan,
  isCurrentPlan = false,
}: {
  plan: SubscriptionPlan;
  isCurrentPlan?: boolean;
}) {
  const price = parseFloat(plan.price);
  const isRecommended = plan.name === "Medium Clinic";

  return (
    <div
      className={`relative rounded-lg border flex flex-col h-full transition-all group ${
        isCurrentPlan
          ? "dark:border-green-500/50 dark:bg-green-950/20 dark:shadow-lg dark:shadow-green-500/20 border-green-300 bg-green-100 shadow-lg shadow-green-200/50 cursor-not-allowed"
          : isRecommended
            ? "dark:border-blue-500 dark:bg-blue-950/20 dark:ring-2 dark:ring-blue-500 border-blue-300 bg-blue-50 ring-2 ring-blue-300 light:dark:text-gray-900"
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

      {/* Badge for recommended plan - shows for Medium Clinic plan */}
      {isRecommended && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 dark:bg-blue-600 dark:text-white bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
          RECOMMENDED
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

      {/* Action button - disabled if this is the current plan */}
      <Button
        disabled={isCurrentPlan}
        className={`w-full mt-6 ${
          isCurrentPlan
            ? "dark:bg-zinc-600 dark:hover:bg-zinc-600 dark:text-white dark:cursor-not-allowed dark:opacity-60 bg-gray-300 hover:bg-gray-300 text-gray-600 cursor-not-allowed opacity-60"
            : isRecommended
              ? "dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white bg-blue-500 hover:bg-blue-600 text-white"
              : "dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white bg-gray-800 hover:bg-gray-900 text-white"
        }`}
      >
        {isCurrentPlan
          ? "Current Plan"
          : price === 0
            ? "Get Started"
            : "Choose Plan"}
      </Button>
    </div>
  );
}
