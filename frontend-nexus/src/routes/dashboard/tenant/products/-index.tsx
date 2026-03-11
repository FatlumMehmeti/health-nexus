import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useDeleteProduct,
  useProducts,
  type Product,
} from '@/services/products.service';
import { useDialogStore } from '@/stores/use-dialog-store';
import { useAuthStore } from '@/stores/auth.store';
import { useMemo } from 'react';
import { toast } from 'sonner';
import {
  RowActions,
  RowIconActionButton,
} from '../-shared';
import {
  formatCurrency,
  getErrorMessage,
} from '../-utils';
import { ProductForm } from './forms/-product-form';

export function ProductsManager() {
  const { open: openDialog, close: closeDialog } = useDialogStore();
  const tenantIdFromStore = useAuthStore((state) => state.tenantId);
  const currentTenantQuery = useProducts(
    Number.isFinite(Number(tenantIdFromStore))
      ? Number(tenantIdFromStore)
      : null
  );
  const products = currentTenantQuery.data?.items ?? [];
  const deleteMutation = useDeleteProduct();

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="max-w-md truncate text-xs text-muted-foreground">
              {row.original.description || 'No description'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }) =>
          formatCurrency(Number(row.original.price)),
      },
      {
        accessorKey: 'stock_quantity',
        header: 'Stock',
      },
      {
        accessorKey: 'is_available',
        header: 'Available',
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.is_available ? 'success' : 'neutral'
            }
          >
            {row.original.is_available ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <RowActions>
            <RowIconActionButton
              mode="edit"
              label="Edit product"
              onClick={() => openEditDialog(row.original)}
            />
            <RowIconActionButton
              mode="delete"
              label="Delete product"
              onClick={() => confirmDeleteProduct(row.original)}
            />
          </RowActions>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function openCreateDialog() {
    if (!tenantIdFromStore) {
      toast.error('Tenant context is missing');
      return;
    }
    openDialog({
      title: 'Add Product',
      content: (
        <ProductForm
          mode="create"
          tenantId={Number(tenantIdFromStore)}
        />
      ),
    });
  }

  function openEditDialog(product: Product) {
    openDialog({
      title: 'Edit Product',
      content: (
        <ProductForm
          mode="edit"
          tenantId={product.tenant_id}
          product={product}
        />
      ),
    });
  }

  function confirmDeleteProduct(product: Product) {
    openDialog({
      title: 'Delete Product?',
      content: (
        <p className="text-muted-foreground text-sm">
          {`Are you sure you want to delete "${product.name}"? Products with order history will be soft-disabled.`}
        </p>
      ),
      footer: (
        <>
          <Button variant="outline" onClick={closeDialog}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              deleteMutation.mutate(
                {
                  productId: product.product_id,
                  tenantId: product.tenant_id,
                },
                {
                  onSuccess: () => {
                    toast.success('Product deleted');
                    closeDialog();
                  },
                  onError: (err) => {
                    toast.error('Failed to delete product', {
                      description: getErrorMessage(err),
                    });
                  },
                }
              )
            }
          >
            Yes, delete
          </Button>
        </>
      ),
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Products</h1>
          <p className="text-muted-foreground">
            Manage your tenant catalog, stock levels, and product availability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog}>Add Product</Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {currentTenantQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : currentTenantQuery.isError ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(currentTenantQuery.error)}
          </p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No products added yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
