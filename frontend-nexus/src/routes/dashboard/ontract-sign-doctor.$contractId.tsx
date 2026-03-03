import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import type { Contract } from "@/interfaces/contract";
import { contractsService } from "@/services/contracts.service";
import { useAuthStore } from "@/stores/auth.store";
import { SignatureModal } from "@/components/contracts/SignatureModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/guards/requireAuth";

export const Route = createFileRoute(
  "/dashboard/ontract-sign-doctor/$contractId",
)({
  beforeLoad: requireAuth(),
  component: ContractSignDoctorPage,
});

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ContractSignDoctorPage() {
  const { contractId } = Route.useParams();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [contract, setContract] = React.useState<Contract | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = React.useState(false);
  const [isSigning, setIsSigning] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const c = await contractsService.getContract(contractId);
        if (!cancelled) setContract(c);
      } catch (err) {
        if (!cancelled) {
          setErrorMessage((err as Error).message ?? "Failed to load contract.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  const isAssignedDoctor =
    contract != null &&
    currentUserId != null &&
    String(contract.doctor_user_id) === currentUserId;

  const canSign =
    isAssignedDoctor &&
    contract != null &&
    !contract.doctor_signed_at &&
    (contract.status === "DRAFT" || contract.status === "ACTIVE");

  const handleSignatureConfirm = async (file: File): Promise<void> => {
    if (!contract) return;

    setIsSigning(true);
    try {
      const updated = await contractsService.signDoctor(contract.id, file);
      toast.success("Contract signed successfully.");
      setContract(updated);
      setShowSignatureModal(false);
    } catch (error) {
      toast.error("Unable to upload signature.", {
        description: (error as Error).message,
      });
      throw error;
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Sign Contract</h1>
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            Loading contract...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorMessage || !contract) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Sign Contract</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{errorMessage ?? "Contract not found."}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/dashboard" })}>
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAssignedDoctor) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Sign Contract</h1>
        <Card>
          <CardHeader>
            <CardTitle>Not authorized</CardTitle>
            <CardDescription>
              Only the assigned doctor (User ID {contract.doctor_user_id}) can sign this contract.
              If you believe this is an error, please contact your tenant manager.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/dashboard"
            className="mb-2 inline-block text-sm text-muted-foreground hover:text-primary"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">Sign Contract #{contract.id}</h1>
          <p className="text-muted-foreground">
            Review the contract below and sign as the assigned doctor.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
          <CardDescription>
            <span className="flex flex-wrap items-center gap-2">
              Doctor ID: {contract.doctor_user_id} · Status:{" "}
              <Badge variant={contract.status === "ACTIVE" ? "success" : "warning"}>
                {contract.status}
              </Badge>
              · Salary: {contract.salary} · {formatDate(contract.start_date)} – {formatDate(contract.end_date)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Terms
            </h3>
            <div
              className="rich-text-content rounded-lg border bg-muted/30 p-4"
              dangerouslySetInnerHTML={{ __html: contract.terms_content || "<p class='text-muted-foreground'>No terms specified.</p>" }}
            />
          </div>

          {contract.doctor_signed_at ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
              <p className="font-medium text-green-800 dark:text-green-200">
                ✓ You have already signed this contract on {formatDate(contract.doctor_signed_at)}.
              </p>
              <Button variant="outline" className="mt-2" onClick={() => navigate({ to: "/dashboard" })}>
                Back to dashboard
              </Button>
            </div>
          ) : canSign ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="mb-3 text-sm font-medium">
                Please sign this contract to confirm your acceptance of the terms.
              </p>
              <Button onClick={() => setShowSignatureModal(true)}>
                Sign as Doctor
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              This contract cannot be signed at this time (status: {contract.status}).
            </p>
          )}
        </CardContent>
      </Card>

      <SignatureModal
        open={showSignatureModal}
        onOpenChange={setShowSignatureModal}
        title="Sign as Doctor"
        description="Draw your signature below, then click Save. This confirms your acceptance of the contract terms."
        onConfirm={handleSignatureConfirm}
        isSubmitting={isSigning}
      />
    </div>
  );
}