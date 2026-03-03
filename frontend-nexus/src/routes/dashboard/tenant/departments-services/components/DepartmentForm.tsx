import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tenantsService } from "@/services/tenants.service";
import { useDialogStore } from "@/stores/use-dialog-store";
import { QUERY_KEYS, type DepartmentDraft } from "../../constants";
import { nullIfBlank, getErrorMessage, createLocalId } from "../../utils";
import { FormField } from "@/components/atoms/form-field";
import { Button } from "@/components/ui/button";

const departmentSchema = z.object({
  department_id: z.string().min(1, "Please select a department"),
  phone_number: z.string().optional(),
  email: z.string().email("Invalid email address").or(z.literal("")).optional(),
  location: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

interface DepartmentFormProps {
  mode: "create" | "edit";
  existingRows: DepartmentDraft[];
  editingLocalId?: string | null;
  catalogOptions: { id: number; name: string }[];
  onSuccess?: () => void;
}

export function DepartmentForm({
  mode,
  existingRows,
  editingLocalId,
  catalogOptions,
  onSuccess,
}: DepartmentFormProps) {
  const { close } = useDialogStore();
  const queryClient = useQueryClient();

  const editingRow = editingLocalId
    ? existingRows.find((r) => r.local_id === editingLocalId)
    : undefined;

  const saveMutation = useMutation({
    mutationFn: (rows: DepartmentDraft[]) =>
      tenantsService.replaceTenantDepartments({
        items: rows.map((r) => ({
          department_id: r.department_id as number,
          phone_number: nullIfBlank(r.phone_number),
          email: nullIfBlank(r.email),
          location: nullIfBlank(r.location),
        })),
      }),
    onSuccess: () => {
      toast.success("Departments updated");
      close();
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.departments });
      onSuccess?.();
    },
    onError: (err) => {
      toast.error("Failed to save departments", {
        description: getErrorMessage(err),
      });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      department_id: String(editingRow?.department_id ?? ""),
      phone_number: editingRow?.phone_number ?? "",
      email: editingRow?.email ?? "",
      location: editingRow?.location ?? "",
    },
  });

  const onSubmit = (values: DepartmentFormValues) => {
    const deptId = Number(values.department_id);
    const selected = catalogOptions.find((d) => d.id === deptId) ?? null;

    // Duplicate check (skip own row when editing)
    if (
      existingRows.some(
        (r) => r.department_id === deptId && r.local_id !== editingLocalId,
      )
    ) {
      toast.error("Duplicate department selected", {
        description: "Each department can appear only once.",
      });
      return;
    }

    const nextRows =
      mode === "edit" && editingLocalId
        ? existingRows.map((r) =>
            r.local_id === editingLocalId
              ? {
                  ...r,
                  department_id: deptId,
                  department_name: selected?.name ?? r.department_name,
                  phone_number: values.phone_number ?? "",
                  email: values.email ?? "",
                  location: values.location ?? "",
                  isEditing: false,
                }
              : r,
          )
        : [
            ...existingRows,
            {
              local_id: createLocalId(),
              department_id: deptId,
              department_name: selected?.name ?? "",
              phone_number: values.phone_number ?? "",
              email: values.email ?? "",
              location: values.location ?? "",
              isEditing: false,
            },
          ];

    saveMutation.mutate(nextRows);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {mode === "edit"
          ? "Update department details. Changes save immediately."
          : "Add a department to your tenant. Saves immediately on confirm."}
      </p>

      <div className="space-y-2">
        <label
          htmlFor="dept-select"
          className="text-sm font-medium leading-none"
        >
          Department{" "}
          <span className="text-destructive -ml-0.5" aria-hidden>
            *
          </span>
        </label>
        <select
          id="dept-select"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          disabled={mode === "edit"}
          {...register("department_id")}
        >
          <option value="">Select department</option>
          {catalogOptions.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        {errors.department_id && (
          <p className="text-xs text-destructive" role="alert">
            {errors.department_id.message}
          </p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          id="dept-phone"
          label="Phone"
          placeholder="+1-555-1001"
          error={errors.phone_number?.message}
          {...register("phone_number")}
        />
        <FormField
          id="dept-email"
          label="Email"
          type="email"
          placeholder="dept@clinic.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          id="dept-location"
          label="Location"
          placeholder="Building A"
          wrapperClassName="md:col-span-2"
          error={errors.location?.message}
          {...register("location")}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={close}
          disabled={saveMutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" loading={saveMutation.isPending}>
          {mode === "edit" ? "Save changes" : "Add department"}
        </Button>
      </div>
    </form>
  );
}
