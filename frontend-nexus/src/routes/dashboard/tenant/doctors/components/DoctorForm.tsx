import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isApiError } from "@/lib/api-client";
import { tenantsService } from "@/services/tenants.service";
import { useDialogStore } from "@/stores/use-dialog-store";
import { FormField } from "@/components/atoms/form-field";
import { FormSelect } from "@/components/atoms/form-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  DoctorCreateForTenant,
  DoctorRead,
  DoctorUpdate,
} from "@/interfaces";
import { QUERY_KEYS } from "../../constants";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------
const createSchema = z.object({
  user_id: z.string().min(1, "Please select a doctor"),
  specialization: z.string().optional(),
  education: z.string().optional(),
  licence_number: z.string().optional(),
});

const editSchema = z.object({
  specialization: z.string().optional(),
  education: z.string().optional(),
  licence_number: z.string().optional(),
  is_active: z.boolean(),
});

// ---------------------------------------------------------------------------
// DoctorForm — handles both create and edit
// ---------------------------------------------------------------------------
interface DoctorFormProps {
  mode: "create" | "edit";
  tenantId: number;
  doctor?: DoctorRead;
  onSuccess?: () => void;
}

export function DoctorForm({
  mode,
  tenantId,
  doctor,
  onSuccess,
}: DoctorFormProps) {
  const { close } = useDialogStore();
  const queryClient = useQueryClient();

  const assignableQuery = useQuery({
    queryKey: ["tenant-manager", "assignable-doctors", tenantId],
    queryFn: () => tenantsService.listAssignableDoctors(tenantId),
    enabled: mode === "create",
  });

  const assignableDoctors = (assignableQuery.data ?? []).filter(
    (d) => d.assigned_tenant_id == null,
  );

  const options = assignableDoctors.map((d) => ({
    value: String(d.id),
    label:
      [d.first_name, d.last_name].filter(Boolean).join(" ") ||
      d.email ||
      `Doctor #${d.id}`,
  }));

  const createMutation = useMutation({
    mutationFn: (data: DoctorCreateForTenant) =>
      tenantsService.createTenantDoctor(data),
    onSuccess: () => {
      toast.success("Doctor added");
      close();
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.doctors });
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(
        isApiError(err) ? err.displayMessage : "Failed to add doctor",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: DoctorUpdate) =>
      tenantsService.updateTenantDoctor(doctor!.user_id, data),
    onSuccess: () => {
      toast.success("Doctor updated");
      close();
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.doctors });
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(
        isApiError(err) ? err.displayMessage : "Failed to update doctor",
      );
    },
  });

  const doctorName = doctor
    ? [doctor.first_name, doctor.last_name].filter(Boolean).join(" ") ||
      `Doctor #${doctor.user_id}`
    : "";

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: (mode === "create"
      ? zodResolver(createSchema)
      : zodResolver(editSchema)) as any,
    defaultValues:
      mode === "create"
        ? {
            user_id: "",
            specialization: "",
            education: "",
            licence_number: "",
          }
        : {
            specialization: doctor?.specialization ?? "",
            education: doctor?.education ?? "",
            licence_number: doctor?.licence_number ?? "",
            is_active: doctor?.is_active ?? true,
          },
  });

  const onSubmit = (values: any) => {
    if (mode === "create") {
      createMutation.mutate({
        user_id: Number(values.user_id),
        specialization: values.specialization?.trim() || null,
        education: values.education?.trim() || null,
        licence_number: values.licence_number?.trim() || null,
      });
    } else {
      updateMutation.mutate({
        specialization: values.specialization?.trim() || null,
        education: values.education?.trim() || null,
        licence_number: values.licence_number?.trim() || null,
        is_active: values.is_active,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {mode === "create"
          ? "Assign an unassigned doctor to this tenant."
          : "Update doctor details for this tenant."}
      </p>

      {mode === "create" ? (
        <Controller
          name="user_id"
          control={control}
          render={({ field }) => (
            <FormSelect
              id="doctor-user-select"
              label="Doctor"
              options={options}
              value={field.value as string}
              onValueChange={field.onChange}
              placeholder="Select a doctor"
              disabled={assignableQuery.isLoading}
              error={(errors as any).user_id?.message}
              helperText={
                !assignableQuery.isLoading && assignableDoctors.length === 0
                  ? "No unassigned doctors available — all DOCTOR role users are already assigned."
                  : undefined
              }
            />
          )}
        />
      ) : (
        <FormField
          id="doctor-name-readonly"
          label="Doctor"
          value={doctorName}
          disabled
          readOnly
          className="bg-muted"
        />
      )}

      <FormField
        id="doctor-specialization"
        label="Specialization"
        placeholder="e.g. General Practice, Cardiology"
        error={errors.specialization?.message}
        {...register("specialization")}
      />
      <FormField
        id="doctor-education"
        label="Education"
        placeholder="e.g. MD, PhD"
        error={errors.education?.message}
        {...register("education")}
      />
      <FormField
        id="doctor-licence"
        label="Licence number"
        placeholder="e.g. MD-001"
        error={errors.licence_number?.message}
        {...register("licence_number")}
      />

      {mode === "edit" && (
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="doctor-active"
                checked={field.value as boolean}
                onCheckedChange={(c) => field.onChange(c === true)}
              />
              <label
                htmlFor="doctor-active"
                className="cursor-pointer text-sm font-normal"
              >
                Active
              </label>
            </div>
          )}
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={close}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          {mode === "create" ? "Add doctor" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
