import type { Contract, ContractStatus } from "@/interfaces/contract";

const STORAGE_KEY = "hn_contracts";

const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  DRAFT: ["ACTIVE", "TERMINATED"],
  ACTIVE: ["EXPIRED", "TERMINATED"],
  EXPIRED: [],
  TERMINATED: [],
};

function nowIso(): string {
  return new Date().toISOString();
}

function parseDate(value?: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function readContracts(): Contract[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Contract[]) : [];
  } catch {
    return [];
  }
}

function writeContracts(contracts: Contract[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `contract_${Math.random().toString(36).slice(2, 11)}`;
}

function sortByUpdatedDesc(contracts: Contract[]): Contract[] {
  return [...contracts].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function validateDateOrder(
  activatedAt?: string | null,
  expiresAt?: string | null,
): void {
  const activatedTimestamp = parseDate(activatedAt);
  const expiresTimestamp = parseDate(expiresAt);
  if (
    activatedTimestamp !== null &&
    expiresTimestamp !== null &&
    expiresTimestamp <= activatedTimestamp
  ) {
    throw new Error("Expiry must be after activation date.");
  }
}

function seedTenantContractsIfNeeded(tenantId: number): Contract[] {
  const contracts = readContracts();
  if (contracts.some((contract) => contract.tenantId === tenantId)) {
    return contracts;
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const inThirtyDays = new Date(now);
  inThirtyDays.setDate(now.getDate() + 30);

  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(now.getDate() - 60);

  const tenDaysAgo = new Date(now);
  tenDaysAgo.setDate(now.getDate() - 10);

  const createdAt = nowIso();

  const seeded: Contract[] = [
    {
      id: generateId(),
      tenantId,
      name: "Standard Renewal Draft",
      status: "DRAFT",
      activatedAt: null,
      expiresAt: null,
      termsMetadata: "{\"version\":1,\"notes\":\"Initial draft terms\"}",
      terminatedReason: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: generateId(),
      tenantId,
      name: "Primary Service Contract",
      status: "ACTIVE",
      activatedAt: yesterday.toISOString(),
      expiresAt: inThirtyDays.toISOString(),
      termsMetadata: "{\"coverage\":\"full\"}",
      terminatedReason: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: generateId(),
      tenantId,
      name: "Legacy Contract 2025",
      status: "EXPIRED",
      activatedAt: sixtyDaysAgo.toISOString(),
      expiresAt: tenDaysAgo.toISOString(),
      termsMetadata: "{\"coverage\":\"legacy\"}",
      terminatedReason: null,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const next = [...contracts, ...seeded];
  writeContracts(next);
  return next;
}

function findContractOrThrow(id: string, contracts: Contract[]): Contract {
  const contract = contracts.find((item) => item.id === id);
  if (!contract) {
    throw new Error("Contract not found.");
  }
  return contract;
}

export const contractsService = {
  async getContracts(tenantId: number): Promise<Contract[]> {
    const contracts = seedTenantContractsIfNeeded(tenantId);
    return sortByUpdatedDesc(
      contracts.filter((contract) => contract.tenantId === tenantId),
    );
  },

  async createContract(
    tenantId: number,
    input: {
      name: string;
      termsMetadata?: string | null;
      activatedAt?: string | null;
      expiresAt?: string | null;
    },
  ): Promise<Contract> {
    validateDateOrder(input.activatedAt, input.expiresAt);

    const allContracts = seedTenantContractsIfNeeded(tenantId);
    const timestamp = nowIso();
    const created: Contract = {
      id: generateId(),
      tenantId,
      name: input.name.trim(),
      status: "DRAFT",
      activatedAt: input.activatedAt ?? null,
      expiresAt: input.expiresAt ?? null,
      termsMetadata: input.termsMetadata ?? null,
      terminatedReason: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const next = [...allContracts, created];
    writeContracts(next);
    return created;
  },

  async updateContract(
    id: string,
    patch: Partial<
      Pick<Contract, "name" | "termsMetadata" | "activatedAt" | "expiresAt">
    >,
  ): Promise<Contract> {
    const allContracts = readContracts();
    const existing = findContractOrThrow(id, allContracts);

    const nextActivatedAt =
      patch.activatedAt !== undefined ? patch.activatedAt : existing.activatedAt;
    const nextExpiresAt =
      patch.expiresAt !== undefined ? patch.expiresAt : existing.expiresAt;

    validateDateOrder(nextActivatedAt, nextExpiresAt);

    const updated: Contract = {
      ...existing,
      ...patch,
      name: patch.name !== undefined ? patch.name.trim() : existing.name,
      updatedAt: nowIso(),
    };

    const next = allContracts.map((contract) =>
      contract.id === id ? updated : contract,
    );

    writeContracts(next);
    return updated;
  },

  async transitionContract(
    id: string,
    nextStatus: ContractStatus,
    reason?: string,
  ): Promise<Contract> {
    const allContracts = readContracts();
    const existing = findContractOrThrow(id, allContracts);

    const allowed = ALLOWED_TRANSITIONS[existing.status];
    if (!allowed.includes(nextStatus)) {
      throw new Error(
        `Invalid transition from ${existing.status} to ${nextStatus}.`,
      );
    }

    const now = nowIso();
    const updated: Contract = {
      ...existing,
      status: nextStatus,
      updatedAt: now,
    };

    if (nextStatus === "ACTIVE" && !existing.activatedAt) {
      updated.activatedAt = now;
    }

    if (nextStatus === "EXPIRED" && !existing.expiresAt) {
      updated.expiresAt = now;
    }

    if (nextStatus === "TERMINATED") {
      const trimmedReason = reason?.trim();
      if (!trimmedReason) {
        throw new Error("Termination reason is required.");
      }
      updated.terminatedReason = trimmedReason;
    }

    const next = allContracts.map((contract) =>
      contract.id === id ? updated : contract,
    );

    writeContracts(next);
    return updated;
  },
};
