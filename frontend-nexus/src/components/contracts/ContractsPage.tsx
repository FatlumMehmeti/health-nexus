import * as React from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useQuery } from "@tanstack/react-query";
import type { Contract, ContractStatus } from "@/interfaces/contract";
import { isApiError } from "@/lib/api-client";
import { contractsService } from "@/services/contracts.service";
import { getCurrentTenantWithFallback } from "@/routes/dashboard/tenant/utils";
import { useAuthStore } from "@/stores/auth.store";
import {
  ContractDialog,
  type ContractDialogSubmitInput,
} from "@/components/contracts/ContractDialog";
import {
  ContractPdfDocument,
  type ReactPdfPrimitives,
} from "@/components/contracts/ContractPdfDocument";
import { SignatureModal } from "@/components/contracts/SignatureModal";
import {
  ActionsDropdown,
  type ActionItem,
} from "@/components/molecules/actions-dropdown";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReactPdfModule = ReactPdfPrimitives & {
  pdf: (document: React.ReactElement) => { toBlob: () => Promise<Blob> };
};

/**
 * Sort newest updates first so admins always see most recently touched contracts first.
 */
function sortByUpdatedDesc(contracts: Contract[]): Contract[] {
  return [...contracts].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

/**
 * Display-safe formatter for API date strings.
 */
function formatDateTime(value?: string | null): string {
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

function getStatusVariant(
  status: ContractStatus,
): React.ComponentProps<typeof Badge>["variant"] {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "DRAFT":
      return "warning";
    case "EXPIRED":
      return "neutral";
    case "TERMINATED":
      return "destructive";
    default:
      return "default";
  }
}

/**
 * Activation requires both signatures per backend business rules.
 */
function hasBothSignatures(contract: Contract): boolean {
  return Boolean(contract.doctor_signed_at && contract.hospital_signed_at);
}

/**
 * Eligibility rule used for the top banner:
 * ACTIVE + both signatures + "today" between start_date and end_date (inclusive).
 */
function isEligibleForDoctorBooking(
  contract: Contract,
  nowTimestamp = Date.now(),
): boolean {
  if (contract.status !== "ACTIVE") return false;
  if (!hasBothSignatures(contract)) return false;

  // Dates come from backend as strings, so we parse once and guard invalid values.
  const startTimestamp = new Date(contract.start_date).getTime();
  const endTimestamp = new Date(contract.end_date).getTime();

  if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp)) return false;
  return nowTimestamp >= startTimestamp && nowTimestamp <= endTimestamp;
}

/**
 * Keep @react-pdf/renderer as a runtime import so the heavy PDF code is only
 * loaded when the user explicitly downloads a PDF.
 */
async function loadReactPdfModule(): Promise<ReactPdfModule> {
  // Use a direct module specifier so Vite can pre-bundle and resolve it correctly.
  const loaded = (await import("@react-pdf/renderer")) as unknown as ReactPdfModule;
  return loaded;
}

function downloadBlob(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}

interface ContractsPageProps {
  /**
   * Test seam: when provided, Sign Doctor/Hospital use this instead of opening the signature modal.
   * Lets tests bypass the canvas UI and supply a mock file directly.
   */
  bypassSignatureModal?: () => Promise<File | null>;
  /**
   * Test seam: when provided, bypass tenant fetch and use this tenant ID directly.
   */
  tenantIdProp?: number;
}

export function ContractsPage({
  bypassSignatureModal,
  tenantIdProp,
}: ContractsPageProps = {}) {
  const tenantIdFromStore = useAuthStore((state) => state.tenantId);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const tenantQuery = useQuery({
    queryKey: ["tenant-manager", "current"],
    queryFn: () => getCurrentTenantWithFallback(tenantIdFromStore),
    enabled: tenantIdProp == null,
  });
  const tenantId = tenantIdProp ?? tenantQuery.data?.id;

  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">(
    "create",
  );
  const [isContractDialogOpen, setIsContractDialogOpen] = React.useState(false);
  const [contractDialogError, setContractDialogError] = React.useState<string | null>(
    null,
  );
  const [selectedContract, setSelectedContract] = React.useState<Contract | null>(
    null,
  );
  const [isDialogSubmitting, setIsDialogSubmitting] = React.useState(false);

  const [terminateTarget, setTerminateTarget] = React.useState<Contract | null>(
    null,
  );
  const [terminateReason, setTerminateReason] = React.useState("");
  const [isTerminating, setIsTerminating] = React.useState(false);

  const [signatureTarget, setSignatureTarget] = React.useState<{
    contract: Contract;
    role: "doctor" | "hospital";
  } | null>(null);
  const [isSigning, setIsSigning] = React.useState(false);

  const loadContracts = React.useCallback(async () => {
    if (tenantId == null) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await contractsService.getContracts(tenantId);
      setContracts(sortByUpdatedDesc(result));
    } catch (error) {
      setErrorMessage((error as Error).message ?? "Failed to load contracts.");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  React.useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  const handleCreateClick = () => {
    setDialogMode("create");
    setSelectedContract(null);
    setContractDialogError(null);
    setIsContractDialogOpen(true);
  };

  const handleEditClick = (contract: Contract) => {
    setDialogMode("edit");
    setSelectedContract(contract);
    setContractDialogError(null);
    setIsContractDialogOpen(true);
  };

  const handleContractSubmit = async (values: ContractDialogSubmitInput) => {
    if (dialogMode === "create" && tenantId == null) {
      toast.error("Tenant context not available. Please refresh the page.");
      return;
    }
    setIsDialogSubmitting(true);
    setContractDialogError(null);

    try {
      if (dialogMode === "create") {
        await contractsService.createContract(tenantId!, values);
        toast.success("Contract created.");
      } else {
        if (!selectedContract) return;

        await contractsService.updateContract(selectedContract.id, {
          salary: values.salary,
          terms_content: values.terms_content,
          start_date: values.start_date,
          end_date: values.end_date,
        });
        toast.success("Contract updated.");
      }

      // We re-fetch after each mutation so UI always reflects backend-computed values/signatures/status.
      await loadContracts();
      setIsContractDialogOpen(false);
      setSelectedContract(null);
    } catch (error) {
      // Show backend detail in-form (e.g. "Doctor not found or does not belong to this tenant").
      const formErrorMessage = isApiError(error)
        ? error.displayMessage
        : ((error as Error).message ?? "Failed to save contract.");
      setContractDialogError(formErrorMessage);

      // Keep toast generic; detailed backend validation text is shown only inside the form.
      toast.error(
        dialogMode === "create"
          ? "Failed to create contract."
          : "Failed to update contract.",
      );
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const handleActivate = async (contract: Contract) => {
    if (!hasBothSignatures(contract)) {
      toast.error("Contract cannot be activated until both signatures are present.");
      return;
    }

    try {
      await contractsService.transitionContract(contract.id, "ACTIVE");
      await loadContracts();
      toast.success(`Contract #${contract.id} activated.`);
    } catch (error) {
      toast.error("Unable to activate contract.", {
        description: (error as Error).message,
      });
    }
  };

  const handleExpire = async (contract: Contract) => {
    try {
      await contractsService.transitionContract(contract.id, "EXPIRED");
      await loadContracts();
      toast.success(`Contract #${contract.id} expired.`);
    } catch (error) {
      toast.error("Unable to expire contract.", {
        description: (error as Error).message,
      });
    }
  };

  const openSignDoctorModal = async (contract: Contract) => {
    if (bypassSignatureModal) {
      const file = await bypassSignatureModal();
      if (file) {
        setIsSigning(true);
        try {
          await contractsService.signDoctor(contract.id, file);
          toast.success(`Doctor signature uploaded for contract #${contract.id}.`);
          await loadContracts();
        } catch (error) {
          toast.error("Unable to upload doctor signature.", {
            description: (error as Error).message,
          });
        } finally {
          setIsSigning(false);
        }
      }
      return;
    }
    setSignatureTarget({ contract, role: "doctor" });
  };

  const openSignHospitalModal = async (contract: Contract) => {
    if (bypassSignatureModal) {
      const file = await bypassSignatureModal();
      if (file) {
        setIsSigning(true);
        try {
          await contractsService.signHospital(contract.id, file);
          toast.success(`Hospital signature uploaded for contract #${contract.id}.`);
          await loadContracts();
        } catch (error) {
          toast.error("Unable to upload hospital signature.", {
            description: (error as Error).message,
          });
        } finally {
          setIsSigning(false);
        }
      }
      return;
    }
    setSignatureTarget({ contract, role: "hospital" });
  };

  const handleSignatureConfirm = async (file: File): Promise<void> => {
    if (!signatureTarget) return;

    setIsSigning(true);
    try {
      if (signatureTarget.role === "doctor") {
        await contractsService.signDoctor(signatureTarget.contract.id, file);
        toast.success(
          `Doctor signature uploaded for contract #${signatureTarget.contract.id}.`,
        );
      } else {
        await contractsService.signHospital(signatureTarget.contract.id, file);
        toast.success(
          `Hospital signature uploaded for contract #${signatureTarget.contract.id}.`,
        );
      }
      await loadContracts();
      setSignatureTarget(null);
    } catch (error) {
      toast.error("Unable to upload signature.", {
        description: (error as Error).message,
      });
      throw error;
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownloadPdf = async (contract: Contract) => {
    try {
      const reactPdf = await loadReactPdfModule();

      const blob = await reactPdf
        .pdf(
          <ContractPdfDocument
            contract={contract}
            primitives={reactPdf as ReactPdfPrimitives}
          />,
        )
        .toBlob();

      downloadBlob(blob, `contract_${contract.id}_doctor_${contract.doctor_user_id}.pdf`);
      toast.success(`Downloaded contract_${contract.id}_doctor_${contract.doctor_user_id}.pdf`);
    } catch (error) {
      toast.error("Unable to generate PDF.", {
        description:
          (error as Error).message ||
          "Install @react-pdf/renderer and retry PDF generation.",
      });
    }
  };

  const openTerminateDialog = (contract: Contract) => {
    setTerminateTarget(contract);
    setTerminateReason("");
  };

  const closeTerminateDialog = () => {
    if (isTerminating) return;
    setTerminateTarget(null);
    setTerminateReason("");
  };

  const handleTerminateConfirm = async () => {
    if (!terminateTarget) return;

    const trimmedReason = terminateReason.trim();
    if (!trimmedReason) {
      toast.error("Termination reason is required.");
      return;
    }

    setIsTerminating(true);
    try {
      await contractsService.transitionContract(
        terminateTarget.id,
        "TERMINATED",
        trimmedReason,
      );
      await loadContracts();
      toast.success(`Contract #${terminateTarget.id} terminated.`);
      closeTerminateDialog();
    } catch (error) {
      toast.error("Unable to terminate contract.", {
        description: (error as Error).message,
      });
    } finally {
      setIsTerminating(false);
    }
  };

  const eligibilitySummary = React.useMemo(() => {
    const eligible = contracts.filter((contract) =>
      isEligibleForDoctorBooking(contract),
    ).length;
    const notEligible = contracts.length - eligible;

    return { eligible, notEligible };
  }, [contracts]);

  const handleCopyDoctorSignLink = (contract: Contract) => {
    if (contract.doctor_signed_at) {
      toast.info("Doctor has already signed this contract.");
      return;
    }
    const url = `${window.location.origin}/dashboard/contract-sign-doctor/${contract.id}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied. Send it to the doctor to sign."),
      () => toast.error("Failed to copy link."),
    );
  };

  const getActions = (contract: Contract): ActionItem[] => {
    const actions: ActionItem[] = [];

    if (contract.status === "DRAFT" || contract.status === "ACTIVE") {
      actions.push({
        label: "Edit",
        onClick: () => handleEditClick(contract),
      });

      const isCurrentUserDoctor =
        currentUserId != null &&
        String(contract.doctor_user_id) === currentUserId;
      if (isCurrentUserDoctor && !contract.doctor_signed_at) {
        actions.push({
          label: "Sign Doctor",
          onClick: () => void openSignDoctorModal(contract),
        });
      }

      if (!contract.doctor_signed_at) {
        actions.push({
          label: "Copy link for doctor to sign",
          onClick: () => handleCopyDoctorSignLink(contract),
        });
      }

      if (!contract.hospital_signed_at) {
        actions.push({
          label: "Sign Hospital",
          onClick: () => void openSignHospitalModal(contract),
        });
      }
    }

    if (contract.status === "DRAFT") {
      // We still show Activate for discoverability, but keep it disabled until both signatures exist.
      actions.push({
        label: "Activate",
        disabled: !hasBothSignatures(contract),
        onClick: () => {
          void handleActivate(contract);
        },
      });
    }

    if (contract.status === "ACTIVE") {
      actions.push({
        label: "Expire",
        onClick: () => {
          void handleExpire(contract);
        },
      });
    }

    if (contract.status === "DRAFT" || contract.status === "ACTIVE") {
      actions.push({
        label: "Terminate",
        variant: "destructive",
        onClick: () => openTerminateDialog(contract),
      });
    }

    actions.push({
      label: "Download PDF",
      onClick: () => {
        void handleDownloadPdf(contract);
      },
    });

    return actions;
  };

  if (tenantIdProp == null) {
    if (tenantQuery.isLoading || (tenantId == null && !tenantQuery.isError)) {
      return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Contracts</h1>
          <Card>
            <CardContent className="pt-6 text-muted-foreground">
              Loading tenant context...
            </CardContent>
          </Card>
        </div>
      );
    }

    if (tenantQuery.isError || tenantId == null) {
      return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Contracts</h1>
          <Card>
            <CardContent className="pt-6 text-destructive">
              Failed to load tenant context. You may not be authorized as a
              tenant manager, or no tenant is assigned to your account.
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Contracts</h1>
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            Loading contracts...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Contracts</h1>
          <p className="text-muted-foreground">
            Manage doctor contracts, signatures, transitions, and exports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadContracts().then(() => toast.success("Contracts refreshed."))}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button onClick={handleCreateClick}>New Contract</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Doctor booking eligibility: {eligibilitySummary.eligible} eligible / {" "}
            {eligibilitySummary.notEligible} not eligible
          </CardTitle>
          <CardDescription>
            Eligible contracts must be ACTIVE, have doctor + hospital signatures,
            and be within the configured start/end date range.
          </CardDescription>
        </CardHeader>
      </Card>

      {errorMessage ? (
        <Card>
          <CardContent className="pt-6 text-destructive">{errorMessage}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Contracts List</CardTitle>
          <CardDescription>
            {contracts.length} contract{contracts.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No contracts yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Doctor Signed</TableHead>
                    <TableHead>Hospital Signed</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => {
                    const actions = getActions(contract);

                    return (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">
                          {contract.doctor_user_id}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(contract.status)}>
                            {contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contract.salary}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(contract.start_date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(contract.end_date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contract.doctor_signed_at
                            ? formatDateTime(contract.doctor_signed_at)
                            : "No"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contract.hospital_signed_at
                            ? formatDateTime(contract.hospital_signed_at)
                            : "No"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(contract.updated_at)}
                        </TableCell>
                        <TableCell>
                          {actions.length > 0 ? (
                            <div className="flex justify-end">
                              <ActionsDropdown actions={actions} trigger="icon" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ContractDialog
        open={isContractDialogOpen}
        mode={dialogMode}
        contract={selectedContract}
        isSubmitting={isDialogSubmitting}
        submitError={contractDialogError}
        onOpenChange={(open) => {
          setIsContractDialogOpen(open);
          if (!open) {
            setSelectedContract(null);
            setContractDialogError(null);
          }
        }}
        onSubmit={handleContractSubmit}
      />

      <SignatureModal
        open={Boolean(signatureTarget)}
        onOpenChange={(open) => !open && setSignatureTarget(null)}
        title={
          signatureTarget?.role === "doctor"
            ? "Sign as Doctor"
            : "Sign as Hospital"
        }
        description={
          signatureTarget?.role === "doctor"
            ? "Draw the doctor's signature below, then click Save. Only the assigned doctor can sign."
            : "Draw the hospital/tenant manager signature below, then click Save."
        }
        onConfirm={handleSignatureConfirm}
        isSubmitting={isSigning}
      />

      <Dialog
        open={Boolean(terminateTarget)}
        onOpenChange={(open) => !open && closeTerminateDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Contract</DialogTitle>
            <DialogDescription>
              Provide a termination reason for contract #{terminateTarget?.id}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="terminate-reason">Reason</Label>
            <Textarea
              id="terminate-reason"
              rows={4}
              placeholder="Termination reason"
              value={terminateReason}
              onChange={(event) => setTerminateReason(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeTerminateDialog}
              disabled={isTerminating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void handleTerminateConfirm();
              }}
              disabled={isTerminating || !terminateReason.trim()}
            >
              {isTerminating ? "Terminating..." : "Terminate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}