import type { TenantSectionKey } from "./constants";
import { TENANT_SECTION_KEYS } from "./constants";

export { TENANT_SECTION_KEYS };
export type { TenantSectionKey };

export function normalizeTenantSection(
  rawSection: string | null | undefined,
): TenantSectionKey {
  const section = (rawSection ?? "").trim();
  if ((TENANT_SECTION_KEYS as readonly string[]).includes(section)) {
    return section as TenantSectionKey;
  }
  return "departments-services";
}