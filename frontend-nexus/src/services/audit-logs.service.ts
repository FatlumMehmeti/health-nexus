import { api } from "@/lib/api-client";
import type { TenantAuditLogRead } from "@/interfaces/audit-log";

export const auditLogsService = {
  list: () => {
    return api.get<TenantAuditLogRead[]>("/audit-logs");
  },
};
