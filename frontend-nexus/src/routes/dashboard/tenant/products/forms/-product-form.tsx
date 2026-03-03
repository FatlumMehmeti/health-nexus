import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tenantsService } from "@/services/tenants.service";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { ProductRead } from "@/interfaces";
import { FormField } from "@/components/atoms/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { QUERY_KEYS } from "../../constants";
import {
  productSchema,
  toProductPayload,
  type ProductFormValues,
} from "../schemas/-product-form.schema";
import { useTenantCrudMutation } from "../hooks/-use-tenant-crud-mutation";

interface ProductFormProps {
  mode: "create" | "edit";
  product?: ProductRead;
  onSuccess?: () => void;
}

export function ProductForm({ mode, product, onSuccess }: ProductFormProps) {
  const closeDialog = useDialogStore((state) => state.close);

  const createMutation = useTenantCrudMutation({
    mutationFn: (values: ProductFormValues) =>
      tenantsService.createTenantProduct(toProductPayload(values)),
    successMessage: "Product created",
    errorTitle: "Failed to create product",
    invalidateQueryKeys: [QUERY_KEYS.products],
    afterSuccess: onSuccess,
  });

  const updateMutation = useTenantCrudMutation({
    mutationFn: (values: ProductFormValues) =>
      tenantsService.updateTenantProduct(
        product!.product_id,
        toProductPayload(values),
      ),
    successMessage: "Product updated",
    errorTitle: "Failed to update product",
    invalidateQueryKeys: [QUERY_KEYS.products],
    afterSuccess: onSuccess,
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      price: String(product?.price ?? ""),
      stock_quantity: String(product?.stock_quantity ?? "0"),
      description: product?.description ?? "",
      is_available: product?.is_available !== false,
    },
  });

  const onSubmit = (values: ProductFormValues) => {
    if (mode === "edit") {
      updateMutation.mutate(values);
      return;
    }
    createMutation.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {mode === "edit"
          ? "Update product details for this tenant."
          : "Create a new product for this tenant."}
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          id="product-name"
          label="Name"
          placeholder="Vitamin D Supplement"
          required
          error={errors.name?.message}
          {...register("name")}
        />
        <FormField
          id="product-price"
          label="Price"
          placeholder="25.00"
          inputMode="decimal"
          required
          error={errors.price?.message}
          {...register("price")}
        />
        <FormField
          id="product-stock"
          label="Stock Quantity"
          placeholder="0"
          inputMode="numeric"
          error={errors.stock_quantity?.message}
          {...register("stock_quantity")}
        />
        <FormField
          id="product-description"
          label="Description"
          placeholder="Daily supplement"
          error={errors.description?.message}
          {...register("description")}
        />
        <Controller
          name="is_available"
          control={control}
          render={({ field }) => (
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              Available on landing page
            </label>
          )}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={closeDialog}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          {mode === "edit" ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
