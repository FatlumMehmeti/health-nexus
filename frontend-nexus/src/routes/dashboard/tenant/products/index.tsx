import { useQuery } from "@tanstack/react-query";
import { isApiError } from "@/lib/api-client";
import { tenantsService } from "@/services/tenants.service";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { ProductRead } from "@/interfaces";
import { QUERY_KEYS } from "../constants";
import { getErrorMessage, formatCurrency } from "../utils";
import { StandardTable, RowActions, RowIconActionButton } from "../shared";
import { ProductForm } from "./forms/-product-form";
import { useTenantCrudMutation } from "./hooks/-use-tenant-crud-mutation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TableHeader,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// ProductsManager
// ---------------------------------------------------------------------------
export function ProductsManager() {
  const { open: openDialog, close: closeDialog } = useDialogStore();

  const productsQuery = useQuery({
    queryKey: QUERY_KEYS.products,
    queryFn: async () => {
      try {
        return await tenantsService.listTenantProducts();
      } catch (err) {
        if (isApiError(err) && err.status === 404) return [] as ProductRead[];
        throw err;
      }
    },
  });
  const products = productsQuery.data ?? [];

  const deleteMutation = useTenantCrudMutation({
    mutationFn: (productId: number) =>
      tenantsService.deleteTenantProduct(productId),
    successMessage: "Product deleted",
    errorTitle: "Failed to delete product",
    invalidateQueryKeys: [QUERY_KEYS.products],
    closeDialogOnSuccess: true,
  });

  const openCreateDialog = () => {
    openDialog({
      title: "Add Product",
      content: <ProductForm mode="create" />,
    });
  };

  const openEditDialog = (product: ProductRead) => {
    openDialog({
      title: "Edit Product",
      content: <ProductForm mode="edit" product={product} />,
    });
  };

  const confirmDeleteProduct = (product: ProductRead) => {
    openDialog({
      title: "Delete Product?",
      content: (
        <p className="text-muted-foreground text-sm">
          Are you sure you want to delete "{product.name}"? This action cannot
          be undone.
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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Products</h1>
          <p className="text-muted-foreground">
            Manage products shown on the tenant landing page.
          </p>
        </div>
        <Button variant="outline" onClick={openCreateDialog}>
          + Add product
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
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
                      {product.description || "-"}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Number(product.price))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.is_available ? "success" : "neutral"}
                      >
                        {product.is_available ? "Yes" : "No"}
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
    </div>
  );
}
