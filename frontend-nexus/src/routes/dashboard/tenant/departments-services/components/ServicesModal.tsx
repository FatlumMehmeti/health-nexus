import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tenantsService } from "@/services/tenants.service";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { ServiceLandingItem } from "@/interfaces";
import { getErrorMessage, formatCurrency } from "../../utils";
import { StandardTable, RowActions, RowIconActionButton } from "../../shared";
import { ServiceForm } from "./ServiceForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TableHeader,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface ServicesModalProps {
  open: boolean;
  tenantDepartmentId: number | null;
  departmentName: string;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function ServicesModal({
  open,
  tenantDepartmentId,
  departmentName,
  onOpenChange,
  onChanged,
}: ServicesModalProps) {
  const queryClient = useQueryClient();
  const { open: openDialog, close: closeDialog } = useDialogStore();

  const servicesQuery = useQuery({
    queryKey: ["tenant-manager", "services", tenantDepartmentId],
    queryFn: () => tenantsService.listServices(tenantDepartmentId as number),
    enabled: open && !!tenantDepartmentId,
  });

  const deleteMutation = useMutation({
    mutationFn: (serviceId: number) => tenantsService.deleteService(serviceId),
    onSuccess: () => {
      toast.success("Service deleted");
      closeDialog();
      if (tenantDepartmentId) {
        void queryClient.invalidateQueries({
          queryKey: ["tenant-manager", "services", tenantDepartmentId],
        });
      }
      onChanged();
    },
    onError: (err) => {
      toast.error("Failed to delete service", {
        description: getErrorMessage(err),
      });
    },
  });

  const openAddServiceDialog = () => {
    if (!tenantDepartmentId) return;
    openDialog({
      title: "Add Service",
      content: (
        <ServiceForm
          mode="create"
          tenantDepartmentId={tenantDepartmentId}
          onSuccess={onChanged}
        />
      ),
    });
  };

  const openEditServiceDialog = (service: ServiceLandingItem) => {
    if (!tenantDepartmentId) return;
    openDialog({
      title: "Edit Service",
      content: (
        <ServiceForm
          mode="edit"
          tenantDepartmentId={tenantDepartmentId}
          service={service}
          onSuccess={onChanged}
        />
      ),
    });
  };

  const confirmDeleteService = (service: ServiceLandingItem) => {
    openDialog({
      title: "Delete Service?",
      content: (
        <p className="text-muted-foreground text-sm">
          Are you sure you want to delete "{service.name}"? This action cannot
          be undone.
        </p>
      ),
      footer: (
        <>
          <Button variant="outline" onClick={closeDialog}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(service.id)}
          >
            Yes, delete
          </Button>
        </>
      ),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{departmentName || "Department"} Services</DialogTitle>
          <DialogDescription>
            Manage services for this department. Changes appear on the public
            landing page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={openAddServiceDialog}
              disabled={!tenantDepartmentId}
            >
              + Add service
            </Button>
          </div>

          <div className="max-h-[50vh] overflow-auto rounded-lg border">
            <StandardTable minWidthClass="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-0">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8">
                      <Skeleton className="h-12 w-full" />
                    </TableCell>
                  </TableRow>
                ) : servicesQuery.isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-destructive"
                    >
                      {getErrorMessage(servicesQuery.error)}
                    </TableCell>
                  </TableRow>
                ) : (servicesQuery.data?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No services yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (servicesQuery.data ?? []).map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">
                        {service.name}
                      </TableCell>
                      <TableCell>{formatCurrency(service.price)}</TableCell>
                      <TableCell className="max-w-sm truncate text-muted-foreground">
                        {service.description || "-"}
                      </TableCell>
                      <TableCell>
                        <RowActions>
                          <RowIconActionButton
                            mode="edit"
                            label="Edit service"
                            onClick={() => openEditServiceDialog(service)}
                          />
                          <RowIconActionButton
                            mode="delete"
                            label="Delete service"
                            onClick={() => confirmDeleteService(service)}
                          />
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </StandardTable>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
