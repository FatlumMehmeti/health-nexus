import { apiFetch } from '@/lib/api-client';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export interface Product {
  product_id: number;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  is_available: boolean;
  tenant_id: number;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
}

export interface CreateProductInput {
  name: string;
  description?: string | null;
  price: number;
  stock_quantity: number;
  is_available: boolean;
  tenant_id: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  price?: number;
  stock_quantity?: number;
  is_available?: boolean;
}

export const productQueryKeys = {
  lists: ['products'] as const,
  list: (tenantId: number) => ['products', tenantId] as const,
  detail: (productId: number) =>
    ['product', productId] as const,
};

export const productsService = {
  list: (tenantId: number, page = 1, size = 50) =>
    apiFetch<ProductListResponse>(
      `/api/products?tenant_id=${tenantId}&page=${page}&size=${size}`
    ),
  get: (productId: number) =>
    apiFetch<Product>(`/api/products/${productId}`),
  create: (payload: CreateProductInput) =>
    apiFetch<Product>('/api/products', {
      method: 'POST',
      body: payload,
    }),
  update: (productId: number, payload: UpdateProductInput) =>
    apiFetch<Product>(`/api/products/${productId}`, {
      method: 'PUT',
      body: payload,
    }),
  delete: (productId: number) =>
    apiFetch<void>(`/api/products/${productId}`, {
      method: 'DELETE',
      skipJson: true,
    }),
};

export function useProducts(tenantId: number | null) {
  return useQuery({
    queryKey: tenantId
      ? productQueryKeys.list(tenantId)
      : ['products', 'missing-tenant'],
    queryFn: () => productsService.list(tenantId!),
    enabled: tenantId !== null,
  });
}

export function useProduct(productId: number | null) {
  return useQuery({
    queryKey: productId
      ? productQueryKeys.detail(productId)
      : ['product', 'missing'],
    queryFn: () => productsService.get(productId!),
    enabled: productId !== null,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsService.create,
    onSuccess: (product) => {
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.list(product.tenant_id),
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: number;
      payload: UpdateProductInput;
    }) => productsService.update(productId, payload),
    onSuccess: (product) => {
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.list(product.tenant_id),
      });
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.detail(product.product_id),
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
    }: {
      productId: number;
      tenantId: number;
    }) => productsService.delete(productId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.list(variables.tenantId),
      });
    },
  });
}
