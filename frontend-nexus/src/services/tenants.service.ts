import { api } from "@/lib/api-client";
import type { TenantCreate, TenantRead, TenantStatus } from "@/interfaces";

/**
 * Tenant service for public and superadmin tenant operations
 */
export const tenantsService = {
  /**
   * Submit a tenant application to join the platform
   * @param data - Tenant application data (name, email, licence_number)
   * @returns Promise with created tenant (status: pending)
   */
  createApplication: (data: TenantCreate) =>
    api.post<TenantRead>("/api/public/tenants", data),

  /**
   * List tenants for superadmin dashboard with optional status filter
   * @param status - Optional status filter (pending, approved, rejected, suspended, archived)
   * @param search - Optional search term for tenant name
   * @returns Promise with array of tenants
   */
  list: (params?: { status?: TenantStatus; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.search) {
      queryParams.append("search", params.search);
    }
    const queryString = queryParams.toString();
    return api.get<TenantRead[]>(
      `/api/superadmin/tenants${queryString ? `?${queryString}` : ""}`,
    );
  },

  /**
   * Update tenant status (approve, reject, suspend, archive)
   * @param tenantId - Tenant ID
   * @param status - New status for the tenant
   * @param reason - Optional reason for status change
   * @returns Promise with updated tenant
   */
  updateStatus: (tenantId: number, status: TenantStatus, reason?: string) => {
    return api.patch<TenantRead>(`/api/superadmin/tenants/${tenantId}/status`, {
      status,
      reason,
    });
  },
};
