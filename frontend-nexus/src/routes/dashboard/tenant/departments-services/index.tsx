import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isApiError } from "@/lib/api-client";
import { tenantsService } from "@/services/tenants.service";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { TenantDepartmentWithServicesRead } from "@/interfaces";
import { QUERY_KEYS, type DepartmentDraft } from "../constants";
import {
  mapTenantDepartmentToDraft,
  nullIfBlank,
  getErrorMessage,
} from "../utils";
import { StandardTable, RowActions, RowIconActionButton } from "../shared";
import { DepartmentForm, ServicesModal } from "./components";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TableHeader,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// TenantDepartmentsManager
// ---------------------------------------------------------------------------
export function TenantDepartmentsManager() {
  const queryClient = useQueryClient();
  const { open: openDialog, close: closeDialog } = useDialogStore();

  const catalogQuery = useQuery({
    queryKey: QUERY_KEYS.departmentCatalog,
    queryFn: () => tenantsService.listDepartmentCatalog(),
  });
  const tenantDepartmentsQuery = useQuery({
    queryKey: QUERY_KEYS.departments,
    queryFn: async () => {
      try {
        return await tenantsService.listTenantDepartments();
      } catch (err) {
        if (isApiError(err) && err.status === 404)
          return [] as TenantDepartmentWithServicesRead[];
        throw err;
      }
    },
  });

  const [rows, setRows] = useState<DepartmentDraft[]>([]);
  const [servicesDept, setServicesDept] = useState<{
    id: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!tenantDepartmentsQuery.data) return;
    setRows(tenantDepartmentsQuery.data.map(mapTenantDepartmentToDraft));
  }, [tenantDepartmentsQuery.data]);

  // Kept for confirm-remove (needs remove row + persist in one place)
  const saveMutation = useMutation({
    mutationFn: (items: DepartmentDraft[]) =>
      tenantsService.replaceTenantDepartments({
        items: items.map((row) => ({
          department_id: row.department_id as number,
          phone_number: nullIfBlank(row.phone_number),
          email: nullIfBlank(row.email),
          location: nullIfBlank(row.location),
        })),
      }),
    onSuccess: (data) => {
      toast.success("Departments updated");
      setRows(data.map(mapTenantDepartmentToDraft));
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.departments });
    },
    onError: (err) => {
      toast.error("Failed to save departments", {
        description: getErrorMessage(err),
      });
    },
  });

  const catalogOptions = catalogQuery.data ?? [];
  const isLoading = catalogQuery.isLoading || tenantDepartmentsQuery.isLoading;
  const loadError = catalogQuery.error ?? tenantDepartmentsQuery.error;

  const openAddDepartmentDialog = () => {
    openDialog({
      title: "Add Department",
      content: (
        <DepartmentForm
          mode="create"
          existingRows={rows}
          catalogOptions={catalogOptions}
        />
      ),
    });
  };

  const openEditDepartmentDialog = (row: DepartmentDraft) => {
    openDialog({
      title: "Edit Department",
      content: (
        <DepartmentForm
          mode="edit"
          existingRows={rows}
          editingLocalId={row.local_id}
          catalogOptions={catalogOptions}
        />
      ),
    });
  };

  const confirmRemoveDepartment = (row: DepartmentDraft) => {
    const deptName = row.department_name || "selected department";
    openDialog({
      title: "Remove Department?",
      content: (
        <p className="text-muted-foreground text-sm">
          Remove "{deptName}" from the list? This action saves immediately.
        </p>
      ),
      footer: (
        <>
          <Button
            variant="outline"
            disabled={saveMutation.isPending}
            onClick={closeDialog}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={saveMutation.isPending}
            onClick={() => {
              const nextRows = rows.filter((r) => r.local_id !== row.local_id);
              saveMutation.mutate(nextRows);
            }}
          >
            Yes, remove
          </Button>
        </>
      ),
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Departments + Services
          </h1>
          <p className="text-muted-foreground">
            Add, edit, and remove departments. Confirmed actions save
            immediately.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={saveMutation.isPending}
          onClick={openAddDepartmentDialog}
        >
          + Add department
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : loadError ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(loadError)}
            </p>
          ) : (
            <>
              <StandardTable minWidthClass="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="min-w-64">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No departments configured yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const departmentName =
                        catalogQuery.data?.find(
                          (d) => d.id === row.department_id,
                        )?.name ||
                        row.department_name ||
                        "-";
                      return (
                        <TableRow key={row.local_id}>
                          <TableCell>{departmentName}</TableCell>
                          <TableCell className="text-sm">
                            {row.phone_number || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.email || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.location || "-"}
                          </TableCell>
                          <TableCell>
                            <RowActions>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!row.id || saveMutation.isPending}
                                onClick={() =>
                                  row.id
                                    ? setServicesDept({
                                        id: row.id,
                                        name: departmentName,
                                      })
                                    : undefined
                                }
                              >
                                View services
                              </Button>
                              <RowIconActionButton
                                mode="edit"
                                label="Edit department"
                                disabled={saveMutation.isPending}
                                onClick={() => openEditDepartmentDialog(row)}
                              />
                              <RowIconActionButton
                                mode="delete"
                                label="Remove department"
                                disabled={saveMutation.isPending}
                                onClick={() => confirmRemoveDepartment(row)}
                              />
                            </RowActions>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </StandardTable>
              <p className="text-xs text-muted-foreground">
                Departments are saved automatically after Add, Edit, and Remove
                actions.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <ServicesModal
        open={!!servicesDept}
        tenantDepartmentId={servicesDept?.id ?? null}
        departmentName={servicesDept?.name ?? ""}
        onOpenChange={(open) => {
          if (!open) setServicesDept(null);
        }}
        onChanged={() => {
          void queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.departments,
          });
        }}
      />
    </div>
  );
}
