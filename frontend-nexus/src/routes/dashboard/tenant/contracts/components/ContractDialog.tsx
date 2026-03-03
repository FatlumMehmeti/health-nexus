import * as React from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Contract } from "@/interfaces/contract";
import { tenantsService } from "@/services/tenants.service";
import { contractsService } from "@/services/contracts.service";
import { isApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/atoms/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HtmlTermsEditor } from "./HtmlTermsEditor";

const contractDialogSchema = z
  .object({
    doctor_user_id: z.coerce
      .number({ invalid_type_error: "Doctor ID is required." })
      .int("Doctor ID must be an integer.")
      .positive("Doctor ID must be greater than 0."),
    salary: z.string().trim().min(1, "Salary is required."),
    start_date: z.string().trim().min(1, "Start date is required."),
    end_date: z.string().trim().min(1, "End date is required."),
    terms_content: z.string().trim().min(1, "Terms content is required."),
  })
  .superRefine((values, context) => {
    const start = new Date(values.start_date).getTime();
    const end = new Date(values.end_date).getTime();

    if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "End date must be after start date.",
      });
    }
  });

type ContractDialogFormValues = z.infer<typeof contractDialogSchema>;

export interface ContractDialogSubmitInput {
  doctor_user_id: number;
  salary: string;
  terms_content: string;
  start_date: string;
  end_date: string;
}

interface ContractDialogProps {
  tenantId: number | undefined;
  /** Callback invoked after successful create/update to refresh the contracts list */
  onSuccess?: () => void | Promise<void>;
}

function toInitialValues(contract?: Contract | null): ContractDialogFormValues {
  return {
    doctor_user_id: contract?.doctor_user_id ?? 0,
    salary: contract?.salary ?? "",
    start_date: contract?.start_date ?? "",
    end_date: contract?.end_date ?? "",
    terms_content: contract?.terms_content ?? "",
  };
}

function toPayload(
  values: ContractDialogFormValues,
): ContractDialogSubmitInput {
  return {
    doctor_user_id: values.doctor_user_id,
    salary: values.salary.trim(),
    terms_content: values.terms_content.trim(),
    start_date: values.start_date,
    end_date: values.end_date,
  };
}

export interface ContractDialogHandle {
  openCreate: () => void;
  openEdit: (contract: Contract) => void;
}

export const ContractDialog = React.forwardRef<
  ContractDialogHandle,
  ContractDialogProps
>(({ tenantId, onSuccess }, ref) => {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [contract, setContract] = React.useState<Contract | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<ContractDialogFormValues>({
    resolver: zodResolver(contractDialogSchema),
    defaultValues: toInitialValues(null),
  });

  React.useImperativeHandle(ref, () => ({
    openCreate: () => {
      setMode("create");
      setContract(null);
      setSubmitError(null);
      form.reset(toInitialValues(null));
      setOpen(true);
    },
    openEdit: (contractToEdit: Contract) => {
      setMode("edit");
      setContract(contractToEdit);
      setSubmitError(null);
      form.reset(toInitialValues(contractToEdit));
      setOpen(true);
    },
  }));

  React.useEffect(() => {
    if (!open) return;
    form.reset(toInitialValues(contract));
  }, [contract, form, open]);

  const {
    register,
    watch,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = form;

  const doctorsQuery = useQuery({
    queryKey: ["tenant-doctors"],
    queryFn: async () => {
      try {
        return await tenantsService.listTenantDoctors();
      } catch (err) {
        if (isApiError(err) && err.status === 404) return [];
        throw err;
      }
    },
    enabled: open && mode === "create",
  });
  const doctors = doctorsQuery.data ?? [];

  const termsContentValue = watch("terms_content");

  const handleTermsChange = React.useCallback(
    (html: string) => setValue("terms_content", html, { shouldValidate: true }),
    [setValue],
  );

  const handleFormSubmit = async (values: ContractDialogFormValues) => {
    if (mode === "create" && tenantId == null) {
      toast.error("Tenant context not available. Please refresh the page.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = toPayload(values);

      if (mode === "create") {
        await contractsService.createContract(tenantId!, payload);
        toast.success("Contract created.");
      } else {
        if (!contract) return;
        await contractsService.updateContract(contract.id, {
          salary: payload.salary,
          terms_content: payload.terms_content,
          start_date: payload.start_date,
          end_date: payload.end_date,
        });
        toast.success("Contract updated.");
      }

      setOpen(false);
      setContract(null);
      await onSuccess?.();
    } catch (error) {
      const formErrorMessage = isApiError(error)
        ? error.displayMessage
        : ((error as Error).message ?? "Failed to save contract.");
      setSubmitError(formErrorMessage);

      toast.error(
        mode === "create"
          ? "Failed to create contract."
          : "Failed to update contract.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mode === "create" ? "New Contract" : "Edit Contract";
  const description =
    mode === "create"
      ? "Create a doctor contract draft for the tenant."
      : "Update contract financial and term details.";

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setContract(null);
      setSubmitError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          id="contract-form"
          className="space-y-4"
          onSubmit={handleSubmit(handleFormSubmit)}
        >
          <div className="space-y-2">
            {mode === "edit" ? (
              <>
                <Label htmlFor="contract-doctor">Doctor</Label>
                <Input
                  id="contract-doctor"
                  value={
                    contract?.doctor_name ??
                    `Doctor ID ${contract?.doctor_user_id ?? ""}`
                  }
                  disabled
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Doctor assignment is immutable after contract creation.
                </p>
              </>
            ) : (
              <Controller
                name="doctor_user_id"
                control={control}
                render={({ field }) => (
                  <FormSelect
                    id="contract-doctor"
                    label="Doctor"
                    options={doctors.map((d) => ({
                      value: String(d.user_id),
                      label:
                        [d.first_name, d.last_name].filter(Boolean).join(" ") ||
                        `Doctor #${d.user_id}` +
                          (d.specialization ? ` (${d.specialization})` : ""),
                    }))}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                    placeholder="Select a doctor"
                    disabled={doctorsQuery.isLoading}
                    error={errors.doctor_user_id?.message}
                    helperText={
                      doctors.length === 0 && !doctorsQuery.isLoading
                        ? "No doctors assigned to this tenant yet. Add doctors in My Tenant → Doctors first."
                        : undefined
                    }
                  />
                )}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract-salary">Salary</Label>
            <Input
              id="contract-salary"
              placeholder="e.g. 12000 USD/month"
              aria-invalid={Boolean(errors.salary?.message)}
              {...register("salary")}
            />
            {errors.salary?.message ? (
              <p className="text-xs text-destructive">
                {errors.salary.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contract-start-date">Start Date</Label>
              <Input
                id="contract-start-date"
                type="date"
                aria-invalid={Boolean(errors.start_date?.message)}
                {...register("start_date")}
              />
              {errors.start_date?.message ? (
                <p className="text-xs text-destructive">
                  {errors.start_date.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract-end-date">End Date</Label>
              <Input
                id="contract-end-date"
                type="date"
                aria-invalid={Boolean(errors.end_date?.message)}
                {...register("end_date")}
              />
              {errors.end_date?.message ? (
                <p className="text-xs text-destructive">
                  {errors.end_date.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract-terms-content">Terms (rich text)</Label>
            <HtmlTermsEditor
              value={termsContentValue ?? ""}
              onChange={handleTermsChange}
              placeholder="Write contract terms (e.g. compensation, responsibilities)..."
              className={
                errors.terms_content ? "border-destructive" : undefined
              }
            />
            {errors.terms_content?.message ? (
              <p className="text-xs text-destructive">
                {errors.terms_content.message}
              </p>
            ) : null}
          </div>
        </form>

        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="contract-form"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ContractDialog.displayName = "ContractDialog";
