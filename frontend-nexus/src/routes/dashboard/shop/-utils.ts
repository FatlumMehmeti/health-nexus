import type { OrderStatus } from '@/services/orders.service';

export function getActiveTenantId(
  tenantIdFromStore?: string
): number | null {
  const parsed = Number(tenantIdFromStore);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function getOrderBadgeVariant(
  status: OrderStatus
): 'warning' | 'success' | 'destructive' | 'neutral' {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'PAID':
      return 'success';
    case 'CANCELLED':
      return 'destructive';
    case 'REFUNDED':
      return 'neutral';
    default:
      return 'neutral';
  }
}
