import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/lib/api-client';
import { requireAuth } from '@/lib/guards/requireAuth';
import {
  useCancelOrder,
  useOrders,
  type Order,
} from '@/services/orders.service';
import { useAuthStore } from '@/stores/auth.store';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  formatCurrency,
  getActiveTenantId,
  getOrderBadgeVariant,
} from './-utils';

export const Route = createFileRoute('/dashboard/shop/orders')({
  beforeLoad: requireAuth({
    routeKey: 'DASHBOARD_MY_ORDERS',
  }),
  component: MyOrdersPage,
});

function MyOrdersPage() {
  const tenantId = getActiveTenantId(
    useAuthStore((state) => state.tenantId)
  );
  const ordersQuery = useOrders({ tenantId });
  const cancelOrder = useCancelOrder();
  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const handleCancel = async (orderId: number) => {
    try {
      await cancelOrder.mutateAsync(orderId);
      toast.success('Order cancelled');
      setSelectedOrder(null);
    } catch (error) {
      toast.error('Failed to cancel order', {
        description: isApiError(error)
          ? error.displayMessage
          : 'Request failed',
      });
    }
  };

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My Orders</h1>
        <p className="text-muted-foreground">
          Review your recent orders and cancel pending ones before payment.
        </p>
      </div>

      {ordersQuery.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : ordersQuery.isError ? (
        <Card>
          <CardContent className="pt-6 text-destructive">
            {isApiError(ordersQuery.error)
              ? ordersQuery.error.displayMessage
              : 'Failed to load orders'}
          </CardContent>
        </Card>
      ) : (ordersQuery.data?.items.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No orders yet for this tenant.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordersQuery.data?.items.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{`Order #${order.id}`}</p>
                    <Badge
                      variant={getOrderBadgeVariant(order.status)}
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">
                    {formatCurrency(order.total_amount)}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedOrder(order)}
                  >
                    View Items
                  </Button>
                  {order.status === 'PENDING' ? (
                    <Button
                      onClick={() => handleCancel(order.id)}
                      disabled={cancelOrder.isPending}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={selectedOrder !== null}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder ? `Order #${selectedOrder.id}` : 'Order'}
            </DialogTitle>
            <DialogDescription>
              Detailed item breakdown for this order.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder ? (
            <div className="space-y-4">
              {selectedOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty {item.quantity} x{' '}
                      {formatCurrency(item.price_at_purchase)}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatCurrency(item.line_total)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
