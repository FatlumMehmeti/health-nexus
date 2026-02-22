export interface TenantAuditLogRead {
  id: number;
  tenant_id: number;
  event_type: string;
  entity_name: string;
  entity_id?: number | null;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  performed_by_user_id?: number | null;
  performed_by_role?: string | null;
  ip_address?: string | null;
  reason?: string | null;
  created_at: string;
}
