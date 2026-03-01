import * as React from "react";
import { toast } from "sonner";

import type { Contract, ContractStatus } from "@/interfaces/contract";
import { contractsService } from "@/services/contracts.service";
import { useAuthStore } from "@/stores/auth.store";
import { ContractDialog, type ContractDialogSubmitInput } from "@/components/contracts/ContractDialog";
import { ActionsDropdown, type ActionItem } from "@/components/molecules/actions-dropdown";
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

function sortByUpdatedDesc(contracts: Contract[]): Contract[] {
  return [...contracts].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

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

function getCurrentActiveContract(contracts: Contract[]): Contract | null {
  const now = Date.now();

  const activeContracts = contracts
    .filter((contract) => {
      if (contract.status !== "ACTIVE") return false;
      if (!contract.activatedAt) return false;

      const activatedAt = new Date(contract.activatedAt).getTime();
      if (Number.isNaN(activatedAt) || activatedAt > now) return false;

      if (!contract.expiresAt) return true;

      const expiresAt = new Date(contract.expiresAt).getTime();
      return !Number.isNaN(expiresAt) && expiresAt >= now;
    })
    .sort((a, b) => {
      const aExpiry = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.POSITIVE_INFINITY;
      const bExpiry = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.POSITIVE_INFINITY;
      return bExpiry - aExpiry;
    });

  return activeContracts[0] ?? null;
}

export function ContractsPage() {
  const tenantIdFromStore = useAuthStore((state) => state.tenantId);
  const tenantId = React.useMemo(() => {
    const parsed = Number(tenantIdFromStore);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [tenantIdFromStore]);

  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create");
  const [isContractDialogOpen, setIsContractDialogOpen] = React.useState(false);
  const [selectedContract, setSelectedContract] = React.useState<Contract | null>(null);
  const [isDialogSubmitting, setIsDialogSubmitting] = React.useState(false);

  const [terminateTarget, setTerminateTarget] = React.useState<Contract | null>(null);
  const [terminateReason, setTerminateReason] = React.useState("");
  const [isTerminating, setIsTerminating] = React.useState(false);

  const loadContracts = React.useCallback(async () => {
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

  const upsertContract = React.useCallback((contract: Contract) => {
    setContracts((previous) => {
      const exists = previous.some((item) => item.id === contract.id);
      return sortByUpdatedDesc(
        exists
          ? previous.map((item) => (item.id === contract.id ? contract : item))
          : [...previous, contract],
      );
    });
  }, []);

  const handleCreateClick = () => {
    setDialogMode("create");
    setSelectedContract(null);
    setIsContractDialogOpen(true);
  };

  const handleEditClick = (contract: Contract) => {
    setDialogMode("edit");
    setSelectedContract(contract);
    setIsContractDialogOpen(true);
  };

  const handleContractSubmit = async (values: ContractDialogSubmitInput) => {
    setIsDialogSubmitting(true);

    try {
      if (dialogMode === "create") {
        const created = await contractsService.createContract(tenantId, values);
        upsertContract(created);
        toast.success("Contract created.");
      } else {
        if (!selectedContract) return;

        const updated = await contractsService.updateContract(selectedContract.id, values);
        upsertContract(updated);
        toast.success("Contract updated.");
      }

      setIsContractDialogOpen(false);
      setSelectedContract(null);
    } catch (error) {
      toast.error("Failed to save contract.", {
        description: (error as Error).message,
      });
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const runTransition = React.useCallback(
    async (id: string, nextStatus: ContractStatus, reason?: string) => {
      const updated = await contractsService.transitionContract(id, nextStatus, reason);
      upsertContract(updated);
      return updated;
    },
    [upsertContract],
  );

  const handleActivate = async (contract: Contract) => {
    try {
      await runTransition(contract.id, "ACTIVE");
      toast.success(`Contract "${contract.name}" activated.`);
    } catch (error) {
      toast.error("Unable to activate contract.", {
        description: (error as Error).message,
      });
    }
  };

  const handleExpire = async (contract: Contract) => {
    try {
      await runTransition(contract.id, "EXPIRED");
      toast.success(`Contract "${contract.name}" expired.`);
    } catch (error) {
      toast.error("Unable to expire contract.", {
        description: (error as Error).message,
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
      await runTransition(terminateTarget.id, "TERMINATED", trimmedReason);
      toast.success(`Contract "${terminateTarget.name}" terminated.`);
      closeTerminateDialog();
    } catch (error) {
      toast.error("Unable to terminate contract.", {
        description: (error as Error).message,
      });
    } finally {
      setIsTerminating(false);
    }
  };

  const bookingEligibleContract = React.useMemo(
    () => getCurrentActiveContract(contracts),
    [contracts],
  );

  const getActions = (contract: Contract): ActionItem[] => {
    const actions: ActionItem[] = [];

    if (contract.status === "DRAFT" || contract.status === "ACTIVE") {
      actions.push({
        label: "Edit",
        onClick: () => handleEditClick(contract),
      });
    }

    if (contract.status === "DRAFT") {
      actions.push({
        label: "Activate",
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

    return actions;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Contracts</h1>
        <Card>
          <CardContent className="pt-6 text-muted-foreground">Loading contracts...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Contracts</h1>
          <p className="text-muted-foreground">Manage tenant contract lifecycle and status transitions.</p>
        </div>
        <Button onClick={handleCreateClick}>New Contract</Button>
      </div>

      <Card
        className={
          bookingEligibleContract
            ? "border-success/40 bg-success/10"
            : "border-destructive/40 bg-destructive/10"
        }
      >
        <CardHeader>
          <CardTitle>
            Booking eligibility: {bookingEligibleContract ? "Allowed" : "Blocked"}
          </CardTitle>
          <CardDescription
            className={bookingEligibleContract ? "text-success" : "text-destructive"}
          >
            {bookingEligibleContract
              ? `Active contract until ${bookingEligibleContract.expiresAt ? formatDateTime(bookingEligibleContract.expiresAt) : "No expiry"}`
              : "No active contract (booking will be blocked once backend checks contracts)."}
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
            <p className="py-8 text-center text-muted-foreground">No contracts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activated</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => {
                    const actions = getActions(contract);

                    return (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.name}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(contract.status)}>
                            {contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(contract.activatedAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contract.expiresAt ? formatDateTime(contract.expiresAt) : "No expiry"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(contract.updatedAt)}
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
        onOpenChange={(open) => {
          setIsContractDialogOpen(open);
          if (!open) {
            setSelectedContract(null);
          }
        }}
        onSubmit={handleContractSubmit}
      />

      <Dialog open={Boolean(terminateTarget)} onOpenChange={(open) => !open && closeTerminateDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Contract</DialogTitle>
            <DialogDescription>
              Provide a termination reason for
              {" "}
              <span className="font-medium">{terminateTarget?.name}</span>
              .
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
