import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Contract } from "@/interfaces/contract";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const contractDialogSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters."),
    termsMetadata: z.string().optional(),
    activatedAt: z.string().optional(),
    expiresAt: z.string().optional(),
  })
  .superRefine((values, context) => {
    const activatedAt = values.activatedAt?.trim();
    const expiresAt = values.expiresAt?.trim();

    if (!activatedAt || !expiresAt) return;

    const activatedAtTimestamp = new Date(activatedAt).getTime();
    const expiresAtTimestamp = new Date(expiresAt).getTime();

    if (
      Number.isFinite(activatedAtTimestamp) &&
      Number.isFinite(expiresAtTimestamp) &&
      expiresAtTimestamp <= activatedAtTimestamp
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "Expiry must be after activation date.",
      });
    }
  });

type ContractDialogFormValues = z.infer<typeof contractDialogSchema>;

export interface ContractDialogSubmitInput {
  name: string;
  termsMetadata?: string | null;
  activatedAt?: string | null;
  expiresAt?: string | null;
}

interface ContractDialogProps {
  open: boolean;
  mode: "create" | "edit";
  contract?: Contract | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContractDialogSubmitInput) => Promise<void> | void;
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function toInitialValues(contract?: Contract | null): ContractDialogFormValues {
  return {
    name: contract?.name ?? "",
    termsMetadata: contract?.termsMetadata ?? "",
    activatedAt: toDateTimeLocal(contract?.activatedAt),
    expiresAt: toDateTimeLocal(contract?.expiresAt),
  };
}

function toPayload(values: ContractDialogFormValues): ContractDialogSubmitInput {
  const activatedAt = values.activatedAt?.trim();
  const expiresAt = values.expiresAt?.trim();
  const termsMetadata = values.termsMetadata?.trim();

  return {
    name: values.name.trim(),
    termsMetadata: termsMetadata ? termsMetadata : null,
    activatedAt: activatedAt ? new Date(activatedAt).toISOString() : null,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
  };
}

export function ContractDialog({
  open,
  mode,
  contract,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: ContractDialogProps) {
  const form = useForm<ContractDialogFormValues>({
    resolver: zodResolver(contractDialogSchema),
    defaultValues: toInitialValues(contract),
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(toInitialValues(contract));
  }, [contract, form, open]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const handleFormSubmit = async (values: ContractDialogFormValues) => {
    await onSubmit(toPayload(values));
  };

  const title = mode === "create" ? "New Contract" : "Edit Contract";
  const description =
    mode === "create"
      ? "Create a contract draft for your tenant."
      : "Update contract details.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
            <Label htmlFor="contract-name">Name</Label>
            <Input
              id="contract-name"
              placeholder="e.g. Primary annual contract"
              aria-invalid={Boolean(errors.name?.message)}
              {...register("name")}
            />
            {errors.name?.message ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract-activatedAt">Activated At</Label>
            <Input
              id="contract-activatedAt"
              type="datetime-local"
              aria-invalid={Boolean(errors.activatedAt?.message)}
              {...register("activatedAt")}
            />
            {errors.activatedAt?.message ? (
              <p className="text-xs text-destructive">{errors.activatedAt.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract-expiresAt">Expires At</Label>
            <Input
              id="contract-expiresAt"
              type="datetime-local"
              aria-invalid={Boolean(errors.expiresAt?.message)}
              {...register("expiresAt")}
            />
            {errors.expiresAt?.message ? (
              <p className="text-xs text-destructive">{errors.expiresAt.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract-termsMetadata">Terms Metadata</Label>
            <Textarea
              id="contract-termsMetadata"
              rows={4}
              placeholder="Optional free text or JSON"
              aria-invalid={Boolean(errors.termsMetadata?.message)}
              {...register("termsMetadata")}
            />
            {errors.termsMetadata?.message ? (
              <p className="text-xs text-destructive">{errors.termsMetadata.message}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="contract-form" disabled={isSubmitting}>
            {isSubmitting
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create"
                : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
