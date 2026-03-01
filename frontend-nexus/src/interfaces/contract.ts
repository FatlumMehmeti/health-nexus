export type ContractStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED";

export interface Contract {
  id: string;
  tenantId: number;
  name: string;
  status: ContractStatus;
  activatedAt?: string | null;
  expiresAt?: string | null;
  termsMetadata?: string | null;
  terminatedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}
