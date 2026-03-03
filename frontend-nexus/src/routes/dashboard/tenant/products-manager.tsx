import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isApiError } from "@/lib/api-client";
import { tenantsService } from "@/services/tenants.service";
import { useDialogStore } from "@/stores/use-dialog-store";
import type {
  ProductCreateForTenant,
  ProductRead,
  ProductUpdateInput,
} from "@/interfaces";
import { QUERY_KEYS } from "./constants";
import type { ProductFormState } from "./constants";
import {
  emptyProductForm,
  nullIfBlank,
  getErrorMessage,
  formatCurrency,
} from "./utils";
import { StandardTable, RowActions, RowIconActionButton, Field } from "./shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TableHeader,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductsManager({ onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient();
  const { open: openDialog, close: closeDialog } = useDialogStore();
  const [form, setForm] = useState<ProductFormState>(emptyProductForm());
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

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

  const createMutation = useMutation({
    mutationFn: (payload: ProductCreateForTenant) => tenantsService.createTenantProduct(payload),
    onSuccess: () => {
      toast.success("Product created");
      closeProductModal();
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      onSaved();
    },
    onError: (err) => {
      toast.error("Failed to create product", {
        description: getErrorMessage(err),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: number;
      payload: ProductUpdateInput;
    }) => tenantsService.updateTenantProduct(productId, payload),
    onSuccess: () => {
      toast.success("Product updated");
      closeProductModal();
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      onSaved();
    },
    onError: (err) => {
      toast.error("Failed to update product", {
        description: getErrorMessage(err),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: number) => tenantsService.deleteTenantProduct(productId),
    onSuccess: () => {
      toast.success("Product deleted");
      closeDialog();
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      onSaved();
    },
    onError: (err) => {
      toast.error("Failed to delete product", {
        description: getErrorMessage(err),
      });
    },
  });

  const confirmDeleteProduct = (product: ProductRead) => {
    openDialog({
      title: "Delete Product?",
      content: (
        <p className="text-muted-foreground text-sm">
          Are you sure you want to delete "{product.name}"? This action cannot be undone.
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

  const openCreateModal = () => {
    setMode("create");
    setEditingProductId(null);
    setForm(emptyProductForm());
  };

  const openEditModal = (product: ProductRead) => {
    setMode("edit");
    setEditingProductId(product.product_id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price ?? ""),
      stock_quantity: String(product.stock_quantity ?? 0),
      is_available: product.is_available !== false,
    });
  };

  const closeProductModal = () => {
    setMode(null);
    setEditingProductId(null);
    setForm(emptyProductForm());
  };

  const parseProductForm = (): ProductCreateForTenant | null => {
    const name = form.name.trim();
    const price = Number(form.price);
    const stockQuantity = Number(form.stock_quantity);
    if (!name) {
      toast.error("Product name is required");
      return null;
    }
    if (!Number.isFinite(price)) {
      toast.error("Product price must be a valid number");
      return null;
    }
    if (!Number.isInteger(stockQuantity)) {
      toast.error("Stock quantity must be an integer");
      return null;
    }

    return {
      name,
      description: nullIfBlank(form.description),
      price,
      stock_quantity: stockQuantity,
      is_available: form.is_available,
    };
  };

  const submit = () => {
    const payload = parseProductForm();
    if (!payload) return;

    if (mode === "edit" && editingProductId !== null) {
      updateMutation.mutate({ productId: editingProductId, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <CardDescription>
          Manage products shown on the tenant landing page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" onClick={openCreateModal} disabled={isSubmitting}>
            + Add product
          </Button>
        </div>

        {productsQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : productsQuery.isError ? (
          <p className="text-sm text-destructive">{getErrorMessage(productsQuery.error)}</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products added yet.</p>
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
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {product.description || "-"}
                  </TableCell>
                  <TableCell>{formatCurrency(Number(product.price))}</TableCell>
                  <TableCell>
                    <Badge variant={product.is_available ? "success" : "neutral"}>
                      {product.is_available ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RowActions>
                      <RowIconActionButton
                        mode="edit"
                        label="Edit product"
                        onClick={() => openEditModal(product)}
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

      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) closeProductModal();
        }}
      >
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "Update product details for this tenant."
                : "Create a new product for this tenant."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Vitamin D Supplement"
              />
            </Field>
            <Field>
              <Label htmlFor="product-price">Price</Label>
              <Input
                id="product-price"
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                placeholder="25.00"
                inputMode="decimal"
              />
            </Field>
            <Field>
              <Label htmlFor="product-stock">Stock Quantity</Label>
              <Input
                id="product-stock"
                value={form.stock_quantity}
                onChange={(e) =>
                  setForm((s) => ({ ...s, stock_quantity: e.target.value }))
                }
                placeholder="0"
                inputMode="numeric"
              />
            </Field>
            <Field>
              <Label htmlFor="product-description">Description</Label>
              <Input
                id="product-description"
                value={form.description}
                onChange={(e) =>
                  setForm((s) => ({ ...s, description: e.target.value }))
                }
                placeholder="Daily supplement"
              />
            </Field>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <Checkbox
                checked={form.is_available}
                onCheckedChange={(checked) =>
                  setForm((s) => ({ ...s, is_available: checked === true }))
                }
              />
              Available on landing page
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeProductModal}>
              Cancel
            </Button>
            <Button onClick={submit} loading={isSubmitting}>
              {mode === "edit" ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
}