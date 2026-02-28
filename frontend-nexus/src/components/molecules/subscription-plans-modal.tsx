import { useEffect, useState } from "react";
import { IconX, IconCheck } from "@tabler/icons-react";
import {
  getSubscriptionPlans,
  type SubscriptionPlan,
} from "@/services/subscription-plans.service";
import { Button } from "@/components/ui/button";

interface SubscriptionPlansModalProps {
  onClose: () => void;
}

export function SubscriptionPlansModal({
  onClose,
}: SubscriptionPlansModalProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const data = await getSubscriptionPlans();
        setPlans(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load plans");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="text-center py-12">Loading plans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="text-center py-12 text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <h1 className="text-4xl font-bold text-center mb-12">
        Choose Your Nexus Plan
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: SubscriptionPlan }) {
  const price = parseFloat(plan.price);
  const isRecommended = plan.name === "Medium Clinic";

  return (
    <div
      className={`relative rounded-lg border p-6 flex flex-col h-full transition-all ${
        isRecommended
          ? "border-blue-500 bg-blue-950/20 ring-2 ring-blue-500"
          : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
          RECOMMENDED
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">${price.toFixed(2)}</span>
          <span className="text-sm text-zinc-400">/month</span>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div className="space-y-3 text-sm">
          {plan.max_doctors && (
            <div className="flex items-start gap-3">
              <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{plan.max_doctors} max doctors</span>
            </div>
          )}
          {plan.max_patients && (
            <div className="flex items-start gap-3">
              <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{plan.max_patients} max patients</span>
            </div>
          )}
          {plan.max_departments && (
            <div className="flex items-start gap-3">
              <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{plan.max_departments} departments</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>{plan.duration} days billing cycle</span>
          </div>
        </div>
      </div>

      <Button
        className={`w-full mt-6 ${
          isRecommended
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-zinc-800 hover:bg-zinc-700 text-white"
        }`}
      >
        {price === 0 ? "Get Started" : "Choose Plan"}
      </Button>
    </div>
  );
}
