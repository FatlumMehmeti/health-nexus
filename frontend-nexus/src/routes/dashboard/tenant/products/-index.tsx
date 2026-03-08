import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProductRead } from '@/interfaces';
import { isApiError } from '@/lib/api-client';
import { tenantsService } from '@/services/tenants.service';
import { useDialogStore } from '@/stores/use-dialog-store';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { QUERY_KEYS } from '../-constants';
import {
  RowActions,
  RowIconActionButton,
  StandardTable,
} from '../-shared';
import { formatCurrency, getErrorMessage } from '../-utils';
import { ProductForm } from './forms/-product-form';

export function ProductsManager() {
  const { open: openDialog, close: closeDialog } = useDialogStore();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: QUERY_KEYS.products,
    queryFn: async () => {
      try {
        return await tenantsService.listTenantProducts();
      } catch (err) {
        if (isApiError(err) && err.status === 404)
          return [] as ProductRead[];
        throw err;
      }
    },
  });
  const products = productsQuery.data ?? [];
  const deleteMutation = useMutation({
    mutationFn: (productId: number) =>
      tenantsService.deleteTenantProduct(productId),
    onSuccess: () => {
      toast.success('Product deleted');
      closeDialog();
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.products,
      });
    },
    onError: (err) => {
      toast.error('Failed to delete product', {
        description: getErrorMessage(err),
      });
    },
  });

  const openCreateDialog = () => {
    openDialog({
      title: 'Add Product',
      content: <ProductForm mode="create" />,
    });
  };

  const openEditDialog = (product: ProductRead) => {
    openDialog({
      title: 'Edit Product',
      content: <ProductForm mode="edit" product={product} />,
    });
  };

  const confirmDeleteProduct = (product: ProductRead) => {
    openDialog({
      title: 'Delete Product?',
      content: (
        <p className="text-muted-foreground text-sm">
          Are you sure you want to delete "{product.name}"? This
          action cannot be undone.
        </p>
      ),
      footer: (
        <>
          <Button variant="outline" onClick={closeDialog}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate(product.product_id)}
          >
            Yes, delete
          </Button>
        </>
      ),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Products</h1>
          <p className="text-muted-foreground">
            Manage doctor contracts, signatures, transitions, and
            exports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog}>+ Add product</Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex justify-end"></div>

        {productsQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : productsQuery.isError ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(productsQuery.error)}
          </p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No products added yet.
          </p>
        ) : (
          <StandardTable minWidthClass="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="w-0">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.product_id}>
                  <TableCell>{product.product_id}</TableCell>
                  <TableCell className="font-medium">
                    {product.name}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {product.description || '-'}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(Number(product.price))}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.is_available ? 'success' : 'neutral'
                      }
                    >
                      {product.is_available ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RowActions>
                      <RowIconActionButton
                        mode="edit"
                        label="Edit product"
                        onClick={() => openEditDialog(product)}
                      />
                      <RowIconActionButton
                        mode="delete"
                        label="Delete product"
                        onClick={() => confirmDeleteProduct(product)}
                      />
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </StandardTable>
        )}
      </CardContent>
    </Card>
  );
}
