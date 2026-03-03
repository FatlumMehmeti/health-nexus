import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tenantsService } from "@/services/tenants.service";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { ServiceLandingItem, ServiceUpdateInput } from "@/interfaces";
import { nullIfBlank, getErrorMessage } from "../../utils";
import { FormField } from "@/components/atoms/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Service name is required"),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((v) => Number.isFinite(Number(v)), "Price must be a valid number"),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  mode: "create" | "edit";
  tenantDepartmentId: number;
  service?: ServiceLandingItem;
  onSuccess: () => void;
}

export function ServiceForm({
  mode,
  tenantDepartmentId,
  service,
  onSuccess,
}: ServiceFormProps) {
  const { close } = useDialogStore();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: ServiceFormValues) =>
      tenantsService.createService({
        tenant_department_id: tenantDepartmentId,
        name: values.name.trim(),
        price: Number(values.price),
        description: nullIfBlank(values.description ?? ""),
      }),
    onSuccess: () => {
      toast.success("Service created");
      close();
      void queryClient.invalidateQueries({
        queryKey: ["tenant-manager", "services", tenantDepartmentId],
      });
      onSuccess();
    },
    onError: (err) => {
      toast.error("Failed to create service", {
        description: getErrorMessage(err),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: ServiceFormValues) =>
      tenantsService.updateService(service!.id, {
        name: values.name.trim(),
        price: Number(values.price),
        description: nullIfBlank(values.description ?? ""),
        is_active: values.is_active,
      } as ServiceUpdateInput),
    onSuccess: () => {
      toast.success("Service updated");
      close();
      void queryClient.invalidateQueries({
        queryKey: ["tenant-manager", "services", tenantDepartmentId],
      });
      onSuccess();
    },
    onError: (err) => {
      toast.error("Failed to update service", {
        description: getErrorMessage(err),
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? "",
      price: String(service?.price ?? ""),
      description: service?.description ?? "",
      is_active: service?.is_active ?? true,
    },
  });

  const onSubmit = (values: ServiceFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
    } else {
      updateMutation.mutate(values);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {mode === "create"
          ? "Create a service for this department."
          : "Update service details for this department."}
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          id="service-name"
          label="Name"
          placeholder="Initial Consultation"
          required
          error={errors.name?.message}
          {...register("name")}
        />
        <FormField
          id="service-price"
          label="Price"
          placeholder="120.00"
          inputMode="decimal"
          required
          error={errors.price?.message}
          {...register("price")}
        />
        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor="service-description"
            className="text-sm font-medium leading-none"
          >
            Description
          </label>
          <textarea
            id="service-description"
            className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="First visit assessment"
            {...register("description")}
          />
        </div>
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={(c) => field.onChange(c === true)}
              />
              Active service
            </label>
          )}
        />
      </div>

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
          {mode === "create" ? "Create service" : "Save service"}
        </Button>
      </div>
    </form>
  );
}
