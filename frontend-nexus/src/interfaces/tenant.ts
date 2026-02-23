/**
 * Tenant interfaces matching backend schemas
 */

/** Status of a tenant application/account */
export enum TenantStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  SUSPENDED = "suspended",
  ARCHIVED = "archived",
}

/** Data required to create a tenant application */
export interface TenantCreate {
  name: string;
  email: string;
  licence_number: string;
}

/** Full tenant details returned from backend */
export interface TenantRead extends TenantCreate {
  id: number;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}
