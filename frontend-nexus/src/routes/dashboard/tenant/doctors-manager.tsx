import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/tenant/doctors-manager')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/tenant/doctors-manager"!</div>
}
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isApiError } from "@/lib/api-client";
import { tenantsService } from "@/services/tenants.service";
import { FormSelect } from "@/components/atoms/form-select";
import type {
  DoctorAssignableRead,
  DoctorCreateForTenant,
  DoctorRead,
  DoctorUpdate,
} from "@/interfaces";
import { QUERY_KEYS } from "./constants";
import { getErrorMessage, formatDate } from "./utils";
import { StandardTable, RowActions, RowIconActionButton } from "./shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Badge } from "@/components/ui/badge";

interface DoctorsManagerProps {
  tenantId: number;
  onSaved?: () => void;
}

export function DoctorsManager({ tenantId, onSaved }: DoctorsManagerProps) {
  const queryClient = useQueryClient();
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorRead | null>(null);
  const [deletingDoctor, setDeletingDoctor] = useState<DoctorRead | null>(null);

  const doctorsQuery = useQuery({
    queryKey: QUERY_KEYS.doctors,
    queryFn: async () => {
      try {
        return await tenantsService.listTenantDoctors();
      } catch (err) {
        if (isApiError(err) && err.status === 404) return [] as DoctorRead[];
        throw err;
      }
    },
  });
  const doctors = doctorsQuery.data ?? [];

  const assignableQuery = useQuery({
    queryKey: ["tenant-manager", "assignable-doctors", tenantId],
    queryFn: () => tenantsService.listAssignableDoctors(tenantId),
    enabled: doctorDialogOpen && !editingDoctor,
  });
  const assignableDoctors = (assignableQuery.data ?? []).filter(
    (d) => d.assigned_tenant_id == null,
  );

  const createMutation = useMutation({
    mutationFn: (data: DoctorCreateForTenant) =>
      tenantsService.createTenantDoctor(data),
    onSuccess: () => {
      toast.success("Doctor added");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.doctors });
      onSaved?.();
      setDoctorDialogOpen(false);
    },
    onError: (err) => {
      toast.error(isApiError(err) ? err.displayMessage : "Failed to add doctor");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: number;
      data: DoctorUpdate;
    }) => tenantsService.updateTenantDoctor(userId, data),
    onSuccess: () => {
      toast.success("Doctor updated");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.doctors });
      onSaved?.();
      setEditingDoctor(null);
      setDoctorDialogOpen(false);
    },
    onError: (err) => {
      toast.error(
        isApiError(err) ? err.displayMessage : "Failed to update doctor",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => tenantsService.deleteTenantDoctor(userId),
    onSuccess: () => {
      toast.success("Doctor removed");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.doctors });
      onSaved?.();
      setDeletingDoctor(null);
    },
    onError: (err) => {
      toast.error(
        isApiError(err) ? err.displayMessage : "Failed to remove doctor",
      );
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Doctors</CardTitle>
          <CardDescription>
            Add, edit, and remove doctors assigned to this tenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {doctorsQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : doctorsQuery.isError ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(doctorsQuery.error)}
            </p>
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingDoctor(null);
                    setDoctorDialogOpen(true);
                  }}
                >
                  + Add doctor
                </Button>
              </div>
              {doctors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No doctors assigned yet.
                </p>
              ) : (
                <StandardTable minWidthClass="min-w-[620px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Licence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="min-w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctors.map((doctor) => (
                      <TableRow key={doctor.user_id}>
                        <TableCell>
                          {[doctor.first_name, doctor.last_name]
                            .filter(Boolean)
                            .join(" ") || `Doctor #${doctor.user_id}`}
                        </TableCell>
                        <TableCell>{doctor.specialization || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {doctor.licence_number || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={doctor.is_active ? "success" : "neutral"}
                          >
                            {doctor.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(doctor.created_at)}
                        </TableCell>
                        <TableCell>
                          <RowActions>
                            <RowIconActionButton
                              mode="edit"
                              label="Edit doctor"
                              onClick={() => {
                                setEditingDoctor(doctor);
                                setDoctorDialogOpen(true);
                              }}
                            />
                            <RowIconActionButton
                              mode="delete"
                              label="Remove doctor"
                              onClick={() => setDeletingDoctor(doctor)}
                            />
                          </RowActions>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </StandardTable>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <DoctorDialog
        open={doctorDialogOpen}
        mode={editingDoctor ? "edit" : "create"}
        doctor={editingDoctor}
        assignableDoctors={assignableDoctors}
        assignableLoading={assignableQuery.isLoading}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitError={createMutation.error ?? updateMutation.error}
        onOpenChange={(open) => {
          if (!open) {
            setDoctorDialogOpen(false);
            setEditingDoctor(null);
          }
        }}
        onCreate={(data) => createMutation.mutate(data)}
        onUpdate={(userId, data) =>
          updateMutation.mutate({ userId, data })
        }
      />

      <Dialog
        open={!!deletingDoctor}
        onOpenChange={(open) => {
          if (!open) setDeletingDoctor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove doctor</DialogTitle>
            <DialogDescription>
              Remove{" "}
              {deletingDoctor
                ? [deletingDoctor.first_name, deletingDoctor.last_name]
                    .filter(Boolean)
                    .join(" ") || `Doctor #${deletingDoctor.user_id}`
                : ""}{" "}
              from this tenant? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingDoctor(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingDoctor)
                  deleteMutation.mutate(deletingDoctor.user_id);
              }}
              disabled={deleteMutation.isPending}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface DoctorDialogProps {
  open: boolean;
  mode: "create" | "edit";
  doctor: DoctorRead | null;
  assignableDoctors: DoctorAssignableRead[];
  assignableLoading: boolean;
  isSubmitting: boolean;
  submitError: unknown;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: DoctorCreateForTenant) => void;
  onUpdate: (userId: number, data: DoctorUpdate) => void;
}

function DoctorDialog({
  open,
  mode,
  doctor,
  assignableDoctors,
  assignableLoading,
  isSubmitting,
  submitError,
  onOpenChange,
  onCreate,
  onUpdate,
}: DoctorDialogProps) {
  const [userId, setUserId] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [education, setEducation] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && doctor) {
      setUserId(String(doctor.user_id));
      setSpecialization(doctor.specialization ?? "");
      setEducation(doctor.education ?? "");
      setLicenceNumber(doctor.licence_number ?? "");
      setIsActive(doctor.is_active);
    } else {
      setUserId("");
      setSpecialization("");
      setEducation("");
      setLicenceNumber("");
      setIsActive(true);
    }
  }, [open, mode, doctor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      const parsed = Number(userId);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast.error("Please select a doctor");
        return;
      }
      onCreate({
        user_id: parsed,
        specialization: specialization.trim() || null,
        education: education.trim() || null,
        licence_number: licenceNumber.trim() || null,
      });
    } else {
      const parsed = Number(userId);
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      onUpdate(parsed, {
        specialization: specialization.trim() || null,
        education: education.trim() || null,
        licence_number: licenceNumber.trim() || null,
        is_active: isActive,
      });
    }
  };

  const options = assignableDoctors.map((d) => ({
    value: String(d.id),
    label:
      [d.first_name, d.last_name].filter(Boolean).join(" ") ||
      d.email ||
      `Doctor #${d.id}`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit doctor" : "Add doctor"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update doctor details for this tenant."
              : "Assign an unassigned doctor to this tenant."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "edit" ? (
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Input
                value={
                  doctor
                    ? [doctor.first_name, doctor.last_name]
                        .filter(Boolean)
                        .join(" ") || `Doctor #${doctor.user_id}`
                    : ""
                }
                disabled
                readOnly
                className="bg-muted"
              />
            </div>
          ) : (
            <FormSelect
              id="doctor-user-select"
              label="Doctor"
              options={options}
              value={userId}
              onValueChange={setUserId}
              placeholder="Select a doctor"
              disabled={assignableLoading}
              helperText={
                !assignableLoading && assignableDoctors.length === 0
                  ? "No unassigned doctors available. All doctors with DOCTOR role are already assigned to a tenant."
                  : undefined
              }
            />
          )}
          <div className="space-y-2">
            <Label htmlFor="doctor-specialization">Specialization</Label>
            <Input
              id="doctor-specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g. General Practice, Cardiology"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-education">Education</Label>
            <Input
              id="doctor-education"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="e.g. MD, PhD"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-licence">Licence number</Label>
            <Input
              id="doctor-licence"
              value={licenceNumber}
              onChange={(e) => setLicenceNumber(e.target.value)}
              placeholder="e.g. MD-001"
            />
          </div>
          {mode === "edit" && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="doctor-active"
                checked={isActive}
                onCheckedChange={(c) => setIsActive(c === true)}
              />
              <Label
                htmlFor="doctor-active"
                className="cursor-pointer text-sm font-normal"
              >
                Active
              </Label>
            </div>
          )}
          {submitError != null && (
            <p className="text-sm text-destructive" role="alert">
              {isApiError(submitError)
                ? submitError.displayMessage
                : "An error occurred"}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {mode === "edit" ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}