import { FormField } from '@/components/atoms/form-field';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { isApiError } from '@/lib/api-client';
import {
  useCreateProduct,
  useUpdateProduct,
  type Product,
} from '@/services/products.service';
import { useDialogStore } from '@/stores/use-dialog-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  productSchema,
  toProductPayload,
  type ProductFormValues,
} from '../schemas/-product-form.schema';

interface ProductFormProps {
  mode: 'create' | 'edit';
  tenantId: number;
  product?: Product;
}

export function ProductForm({
  mode,
  tenantId,
  product,
}: ProductFormProps) {
  const closeDialog = useDialogStore((state) => state.close);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const isPending =
    createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: ProductFormValues) => {
    const payload = toProductPayload(values);
    if (mode === 'edit' && product) {
      updateMutation.mutate(
        {
          productId: product.product_id,
          payload,
        },
        {
          onSuccess: () => {
            toast.success('Product updated');
            closeDialog();
          },
          onError: (err) => {
            toast.error('Failed to update product', {
              description: isApiError(err)
                ? err.displayMessage
                : 'Request failed',
            });
          },
        }
      );
      return;
    }

    createMutation.mutate(
      {
        ...payload,
        tenant_id: tenantId,
      },
      {
        onSuccess: () => {
          toast.success('Product created');
          closeDialog();
        },
        onError: (err) => {
          toast.error('Failed to create product', {
            description: isApiError(err)
              ? err.displayMessage
              : 'Request failed',
          });
        },
      }
    );
  };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      price: String(product?.price ?? ''),
      stock_quantity: String(product?.stock_quantity ?? '0'),
      description: product?.description ?? '',
      is_available: product?.is_available !== false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {mode === 'edit'
          ? 'Update product details for this tenant.'
          : 'Create a new product for this tenant.'}
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          id="product-name"
          label="Name"
          placeholder="Vitamin D Supplement"
          required
          error={errors.name?.message}
          {...register('name')}
        />
        <FormField
          id="product-price"
          label="Price"
          placeholder="25.00"
          inputMode="decimal"
          required
          error={errors.price?.message}
          {...register('price')}
        />
        <FormField
          id="product-stock"
          label="Stock Quantity"
          placeholder="0"
          inputMode="numeric"
          error={errors.stock_quantity?.message}
          {...register('stock_quantity')}
        />
        <FormField
          id="product-description"
          label="Description"
          placeholder="Daily supplement"
          error={errors.description?.message}
          {...register('description')}
        />
        <Controller
          name="is_available"
          control={control}
          render={({ field }) => (
            <label className="inline-flex items-center gap-3 text-sm md:col-span-2">
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              Available in shop
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
          {mode === 'edit' ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
