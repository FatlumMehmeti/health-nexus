import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/lib/api-client';
import { requireAuth } from '@/lib/guards/requireAuth';
import { resolveMediaUrl } from '@/lib/media-url';
import {
  getProductCategoryLabel,
  PRODUCT_CATEGORY_OPTIONS,
} from '@/lib/product-categories';
import {
  useAddCartItem,
  useCart,
} from '@/services/cart.service';
import {
  useProduct,
  useProducts,
} from '@/services/products.service';
import { useAuthStore } from '@/stores/auth.store';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  formatCurrency,
  getActiveTenantId,
} from './-utils';

export const Route = createFileRoute('/dashboard/shop/')({
  beforeLoad: requireAuth({
    routeKey: 'DASHBOARD_SHOP',
  }),
  component: ShopPage,
});

function ShopPage() {
  const authStatus = useAuthStore((state) => state.status);
  const tenantIdFromStore = useAuthStore(
    (state) => state.tenantId
  );
  const tenantId = getActiveTenantId(tenantIdFromStore);
  const isTenantHydrating =
    authStatus === 'loading' && tenantId === null;
  const [lastTenantId, setLastTenantId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState<
    'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'
  >('name_asc');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [appliedMinPriceInput, setAppliedMinPriceInput] =
    useState('');
  const [appliedMaxPriceInput, setAppliedMaxPriceInput] =
    useState('');
  const [selectedProductId, setSelectedProductId] =
    useState<number | null>(null);

  const minPrice = appliedMinPriceInput
    ? Number(appliedMinPriceInput)
    : undefined;
  const maxPrice = appliedMaxPriceInput
    ? Number(appliedMaxPriceInput)
    : undefined;

  const productsQuery = useProducts(
    tenantId === null || isTenantHydrating
      ? null
      : {
          tenantId,
          page,
          size: 9,
          q: searchInput.trim() || undefined,
          category: category === 'ALL' ? undefined : category,
          sort,
          minPrice:
            appliedMinPriceInput && Number.isFinite(minPrice)
              ? minPrice
              : undefined,
          maxPrice:
            appliedMaxPriceInput && Number.isFinite(maxPrice)
              ? maxPrice
              : undefined,
        }
  );
  const cartQuery = useCart(tenantId);
  const addItem = useAddCartItem();
  const productDetailQuery = useProduct(
    selectedProductId,
    tenantId
  );

  const cartCount =
    cartQuery.data?.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    ) ?? 0;
  const totalPages = productsQuery.data
    ? Math.max(
        1,
        Math.ceil(
          productsQuery.data.total /
            productsQuery.data.page_size
        )
      )
    : page;
  const categoryOptions = PRODUCT_CATEGORY_OPTIONS;
  const sortOptions = [
    { value: 'name_asc', label: 'Name (A-Z)' },
    { value: 'name_desc', label: 'Name (Z-A)' },
    { value: 'price_asc', label: 'Price (Low -> High)' },
    { value: 'price_desc', label: 'Price (High -> Low)' },
  ] as const;

  useEffect(() => {
    if (tenantId === null) return;
    if (tenantIdFromStore === String(tenantId)) return;
    useAuthStore.setState({
      tenantId: String(tenantId),
    });
  }, [tenantId, tenantIdFromStore]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAppliedMinPriceInput(minPriceInput);
      setAppliedMaxPriceInput(maxPriceInput);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [minPriceInput, maxPriceInput]);

  useEffect(() => {
    setPage(1);
  }, [searchInput, category, sort, appliedMinPriceInput, appliedMaxPriceInput]);

  useEffect(() => {
    if (isTenantHydrating) return;
    if (tenantId === lastTenantId) return;
    setLastTenantId(tenantId);
    setPage(1);
    setSearchInput('');
    setCategory('ALL');
    setSort('name_asc');
    setMinPriceInput('');
    setMaxPriceInput('');
    setAppliedMinPriceInput('');
    setAppliedMaxPriceInput('');
  }, [tenantId, lastTenantId]);

  useEffect(() => {
    if (productsQuery.data && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, productsQuery.data, totalPages]);

  const handlePreviousPage = () => {
    setPage((current) => Math.max(1, current - 1));
  };

  const handleNextPage = () => {
    setPage((current) =>
      Math.min(totalPages, current + 1)
    );
  };

  const handleAddToCart = async (productId: number) => {
    if (tenantId === null) {
      toast.error('Select a tenant before shopping');
      return;
    }

    try {
      await addItem.mutateAsync({
        tenant_id: tenantId,
        product_id: productId,
        quantity: 1,
      });
      toast.success('Added to cart');
    } catch (error) {
      toast.error('Failed to add item', {
        description: isApiError(error)
          ? error.displayMessage
          : 'Request failed',
      });
    }
  };

  if (isTenantHydrating) {
    return (
      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Shop</h1>
          <p className="text-muted-foreground">
            Restoring your storefront context.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (tenantId === null) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Shop</CardTitle>
            <CardDescription>
              Select a tenant first so products can be loaded for the right clinic.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-40 sm:space-y-6 sm:p-6 sm:pb-32 lg:p-8 lg:pb-28">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Shop</h1>
          <p className="text-muted-foreground">
            Browse healthcare products available for your active tenant.
          </p>
        </div>
        <Link to="/dashboard/shop/cart">
          <Button className="gap-2">
            <ShoppingCart className="size-4" />
            Cart
            <Badge variant="secondary">{cartCount}</Badge>
          </Button>
        </Link>
      </div>

      {productsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full" />
          ))}
        </div>
      ) : productsQuery.isError ? (
        <Card>
          <CardContent className="pt-6 text-destructive">
            {isApiError(productsQuery.error)
              ? productsQuery.error.displayMessage
              : 'Failed to load products'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_180px_180px_180px_180px]">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Search
                </label>
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(event.target.value)
                  }
                  placeholder="Search products..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Category
                </label>
                <Select
                  value={category}
                  onValueChange={setCategory}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder="All categories"
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      All categories
                    </SelectItem>
                    {categoryOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Sort by
                </label>
                <Select
                  value={sort}
                  onValueChange={(value) =>
                    setSort(
                      value as
                        | 'name_asc'
                        | 'name_desc'
                        | 'price_asc'
                        | 'price_desc'
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Min price
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minPriceInput}
                  onChange={(event) =>
                    setMinPriceInput(event.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Max price
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxPriceInput}
                  onChange={(event) =>
                    setMaxPriceInput(event.target.value)
                  }
                  placeholder="100.00"
                />
              </div>
            </CardContent>
          </Card>

          {(productsQuery.data?.items.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No products matched the current filters.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {productsQuery.data?.items.map((product) => (
                <Card
                  key={product.product_id}
                  className="overflow-hidden transition-shadow hover:shadow-md"
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setSelectedProductId(product.product_id)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' ||
                      event.key === ' '
                    ) {
                      event.preventDefault();
                      setSelectedProductId(product.product_id);
                    }
                  }}
                >
                  <div className="flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                    {product.image_url ? (
                      <img
                        src={resolveMediaUrl(product.image_url) ?? ''}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-sm font-medium text-primary shadow-sm">
                        {getProductCategoryLabel(product.category) ||
                          'Wellness Essentials'}
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{product.name}</CardTitle>
                        <CardDescription className="mt-2">
                          {product.description ||
                            'No description available.'}
                        </CardDescription>
                        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                          {getProductCategoryLabel(product.category) ||
                            'Uncategorized'}
                        </p>
                      </div>
                      <Badge
                        variant={
                          product.stock_quantity > 0
                            ? 'success'
                            : 'destructive'
                        }
                      >
                        {product.stock_quantity > 0
                          ? `${product.stock_quantity} in stock`
                          : 'Out of stock'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Price
                      </p>
                      <p className="text-xl font-semibold">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                    <Button
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleAddToCart(product.product_id);
                      }}
                      disabled={
                        product.stock_quantity <= 0 || addItem.isPending
                      }
                    >
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mb-6 flex flex-col items-center gap-3 rounded-lg border bg-card/70 p-4 sm:mb-8 sm:flex-row sm:justify-center">
            <p className="text-sm text-muted-foreground">
              Page {productsQuery.data?.page ?? page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreviousPage}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={selectedProductId !== null}
        onOpenChange={(open) => !open && setSelectedProductId(null)}
      >
        <DialogContent className="max-w-3xl">
          {productDetailQuery.isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : productDetailQuery.isError ? (
            <div className="pt-6 text-destructive">
              {isApiError(productDetailQuery.error)
                ? productDetailQuery.error.displayMessage
                : 'Failed to load product details'}
            </div>
          ) : productDetailQuery.data ? (
            <>
              <DialogHeader>
                <DialogTitle>{productDetailQuery.data.name}</DialogTitle>
                <DialogDescription>
                  {getProductCategoryLabel(
                    productDetailQuery.data.category
                  ) || 'Uncategorized'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
                <div className="overflow-hidden rounded-xl border bg-muted/30">
                  {productDetailQuery.data.image_url ? (
                    <img
                      src={
                        resolveMediaUrl(
                          productDetailQuery.data.image_url
                        ) ?? ''
                      }
                      alt={productDetailQuery.data.name}
                      className="h-full max-h-[360px] w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                      No product image
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Description
                    </p>
                    <p className="mt-1">
                      {productDetailQuery.data.description ||
                        'No description available.'}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Price
                      </p>
                      <p className="mt-1 text-xl font-semibold">
                        {formatCurrency(productDetailQuery.data.price)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Stock
                      </p>
                      <p className="mt-1 text-xl font-semibold">
                        {productDetailQuery.data.stock_quantity}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Category
                    </p>
                    <p className="mt-1 font-medium">
                      {getProductCategoryLabel(
                        productDetailQuery.data.category
                      ) || 'Uncategorized'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        handleAddToCart(
                          productDetailQuery.data!.product_id
                        )
                      }
                      disabled={
                        productDetailQuery.data.stock_quantity <= 0 ||
                        addItem.isPending
                      }
                    >
                      Add to Cart
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedProductId(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
