// Central RBAC role definitions shared across the frontend.
export type Role =
  | 'SUPER_ADMIN'
  | 'TENANT_MANAGER'
  | 'DOCTOR'
  | 'SALES'
  | 'CLIENT'

/**
 * Route keys that participate in RBAC checks.
 *
 * These are logical identifiers, not URL paths,
 * to decouple UI routing from authorization rules.
 */
export type RouteKey =
  | 'DASHBOARD_HOME'
  | 'DASHBOARD_DATA'
  | 'DASHBOARD_FORMS'
  | 'DASHBOARD_GLOBAL_STATE'
  | 'DASHBOARD_LANDING_PAGES'

// Internal mapping of route keys to roles that can access them.
const rbacMatrix: Record<RouteKey, Role[]> = {
  DASHBOARD_HOME: ['SUPER_ADMIN', 'TENANT_MANAGER', 'DOCTOR', 'SALES'],
  DASHBOARD_DATA: ['SUPER_ADMIN', 'TENANT_MANAGER'],
  DASHBOARD_FORMS: ['SUPER_ADMIN', 'TENANT_MANAGER', 'DOCTOR'],
  DASHBOARD_GLOBAL_STATE: ['SUPER_ADMIN'],
  DASHBOARD_LANDING_PAGES: ['SUPER_ADMIN', 'TENANT_MANAGER', 'SALES'],
}

export function canAccess(role: Role | null | undefined, routeKey: RouteKey): boolean {
  if (!role) return false
  const allowed = rbacMatrix[routeKey]
  return allowed?.includes(role) ?? false
}

// Returns all roles that are allowed to access the given route key.
export function getAllowedRoles(routeKey: RouteKey): Role[] {
  return rbacMatrix[routeKey] ?? []
}
