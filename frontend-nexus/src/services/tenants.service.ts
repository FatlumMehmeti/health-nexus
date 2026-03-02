import { api } from "@/lib/api-client";
import type {
  TenantCreate,
  TenantRead,
  TenantStatus,
  FontRead,
  BrandPaletteRead,
  DepartmentRead,
  TenantPublicCard,
  TenantLandingPageResponse,
  TenantCurrentRead,
  TenantDetailsRead,
  TenantDetailsUpdate,
  DoctorRead,
  DoctorCreateForTenant,
  DoctorUpdate,
  DoctorAssignableRead,
  TenantDepartmentWithServicesRead,
  TenantDepartmentsBulkRequest,
  ProductRead,
  ProductCreateForTenant,
  ProductUpdateInput,
  ServiceLandingItem,
  ServiceRead,
  ServiceCreateInput,
  ServiceUpdateInput,
} from "@/interfaces";

/**
 * Tenant service for public and superadmin tenant operations
 */
export const tenantsService = {
  /**
   * List approved tenants for public display (e.g. tenant selector). No auth.
   */
  listPublicTenants: () => api.get<TenantPublicCard[]>("/api/tenants"),

  /**
   * Get full landing page data for a tenant by slug (public). No auth.
   */
  getLandingBySlug: (slug: string) =>
    api.get<TenantLandingPageResponse>(`/api/tenants/by-slug/${encodeURIComponent(slug)}/landing`),

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

  /** List fonts for tenant branding dropdown (no auth). */
  listFonts: () => api.get<FontRead[]>("/api/fonts"),

  /** List brand palettes for tenant branding cards (no auth). */
  listBrands: () => api.get<BrandPaletteRead[]>("/api/brands"),

  /** List global departments for tenant department assignment (no auth). */
  listDepartmentCatalog: () => api.get<DepartmentRead[]>("/api/departments"),

  // Tenant manager (JWT-scoped) endpoints
  getCurrentTenant: () => api.get<TenantCurrentRead>("/api/tenants/current"),
  getTenantDetails: () => api.get<TenantDetailsRead>("/api/tenants/details"),
  updateTenantDetails: (data: TenantDetailsUpdate) =>
    api.put<TenantDetailsRead>("/api/tenants/details", data),
  listTenantDoctors: () => api.get<DoctorRead[]>("/api/tenants/doctors"),
  listAssignableDoctors: (excludeTenantId: number) =>
    api.get<DoctorAssignableRead[]>(
      `/api/users/doctors?exclude_tenant_id=${encodeURIComponent(String(excludeTenantId))}`,
    ),
  createTenantDoctor: (data: DoctorCreateForTenant) =>
    api.post<DoctorRead>("/api/tenants/doctors", data),
  updateTenantDoctor: (userId: number, data: DoctorUpdate) =>
    api.put<DoctorRead>(`/api/tenants/doctors/${userId}`, data),
  deleteTenantDoctor: (userId: number) =>
    api.delete<void>(`/api/tenants/doctors/${userId}`),
  listTenantDepartments: () =>
    api.get<TenantDepartmentWithServicesRead[]>("/api/tenants/departments"),
  replaceTenantDepartments: (data: TenantDepartmentsBulkRequest) =>
    api.post<TenantDepartmentWithServicesRead[]>("/api/tenants/departments", data),
  listTenantProducts: () => api.get<ProductRead[]>("/api/tenants/products"),
  createTenantProduct: (data: ProductCreateForTenant) =>
    api.post<ProductRead>("/api/tenants/products", data),
  updateTenantProduct: (productId: number, data: ProductUpdateInput) =>
    api.put<ProductRead>(`/api/tenants/products/${productId}`, data),
  deleteTenantProduct: (productId: number) =>
    api.delete<void>(`/api/tenants/products/${productId}`),

  // Services (per tenant department)
  listServices: (tenantDepartmentId: number) =>
    api.get<ServiceLandingItem[]>(
      `/api/services?tenant_department_id=${encodeURIComponent(String(tenantDepartmentId))}`,
    ),
  createService: (data: ServiceCreateInput) => api.post<ServiceRead>("/api/services", data),
  updateService: (serviceId: number, data: ServiceUpdateInput) =>
    api.put<ServiceRead>(`/api/services/${serviceId}`, data),
  deleteService: (serviceId: number) => api.delete<void>(`/api/services/${serviceId}`),
};