import { api } from "@/lib/api-client";
import type { TenantCreate, TenantRead } from "@/interfaces";

/**
 * Tenant service for public tenant operations
 */
export const tenantsService = {
  /**
   * Submit a tenant application to join the platform
   * @param data - Tenant application data (name, email, licence_number)
   * @returns Promise with created tenant (status: pending)
   */
  createApplication: (data: TenantCreate) =>
    api.post<TenantRead>("/api/public/tenants", data),
};
