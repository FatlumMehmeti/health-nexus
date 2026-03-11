import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/lib/api-client';
import { requireAuth } from '@/lib/guards/requireAuth';
import {
  useAddCartItem,
  useCart,
} from '@/services/cart.service';
import { useProducts } from '@/services/products.service';
import { useAuthStore } from '@/stores/auth.store';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ShoppingCart } from 'lucide-react';
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
  const tenantId = getActiveTenantId(
    useAuthStore((state) => state.tenantId)
  );
  const productsQuery = useProducts(tenantId);
  const cartQuery = useCart(tenantId);
  const addItem = useAddCartItem();

  const cartCount =
    cartQuery.data?.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    ) ?? 0;

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
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {productsQuery.data?.items.map((product) => (
            <Card
              key={product.product_id}
              className="overflow-hidden"
            >
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                <div className="rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-sm font-medium text-primary shadow-sm">
                  Wellness Essentials
                </div>
              </div>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{product.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {product.description ||
                        'No description available.'}
                    </CardDescription>
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
                  onClick={() =>
                    handleAddToCart(product.product_id)
                  }
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
    </div>
  );
}
