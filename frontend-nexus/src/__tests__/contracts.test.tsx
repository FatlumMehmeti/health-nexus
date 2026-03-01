import { jest } from "@jest/globals";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ContractsPage } from "@/components/contracts/ContractsPage";
import { useAuthStore } from "@/stores/auth.store";
import type { Contract } from "@/interfaces/contract";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const STORAGE_KEY = "hn_contracts";

function setTenantContext(tenantId: string) {
  useAuthStore.setState((state) => ({ ...state, tenantId }));
}

function writeContracts(contracts: Contract[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
}

function baseContract(overrides: Partial<Contract>): Contract {
  return {
    id: `contract-${Math.random().toString(36).slice(2)}`,
    tenantId: 1,
    name: "Contract",
    status: "DRAFT",
    activatedAt: null,
    expiresAt: null,
    termsMetadata: null,
    terminatedReason: null,
    createdAt: "2026-02-01T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("ContractsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setTenantContext("1");
  });

  it("DRAFT row shows Activate; activating updates status to ACTIVE and banner to Allowed", async () => {
    const draft = baseContract({ id: "draft-1", name: "Draft Contract", status: "DRAFT" });
    const expired = baseContract({
      id: "expired-1",
      name: "Expired Contract",
      status: "EXPIRED",
      activatedAt: "2025-12-01T08:00:00.000Z",
      expiresAt: "2026-01-10T08:00:00.000Z",
    });

    writeContracts([draft, expired]);

    const user = userEvent.setup();
    render(<ContractsPage />);

    await screen.findByText("Draft Contract");
    expect(screen.getByText("Booking eligibility: Blocked")).toBeInTheDocument();

    const draftRow = screen.getByText("Draft Contract").closest("tr");
    expect(draftRow).not.toBeNull();

    const actionsButton = within(draftRow as HTMLTableRowElement).getByRole("button", {
      name: /open menu/i,
    });

    await user.click(actionsButton);
    expect(screen.getByRole("menuitem", { name: "Activate" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "Activate" }));

    await waitFor(() => {
      const updatedRow = screen.getByText("Draft Contract").closest("tr");
      expect(updatedRow).not.toBeNull();
      expect(within(updatedRow as HTMLTableRowElement).getByText("ACTIVE")).toBeInTheDocument();
      expect(screen.getByText("Booking eligibility: Allowed")).toBeInTheDocument();
    });
  });

  it("ACTIVE row shows Expire + Terminate, and DRAFT row does not show Expire", async () => {
    const draft = baseContract({ id: "draft-2", name: "Draft Contract", status: "DRAFT" });
    const active = baseContract({
      id: "active-2",
      name: "Active Contract",
      status: "ACTIVE",
      activatedAt: "2026-02-10T08:00:00.000Z",
      expiresAt: "2026-03-10T08:00:00.000Z",
    });

    writeContracts([draft, active]);

    const user = userEvent.setup();
    render(<ContractsPage />);

    await screen.findByText("Active Contract");

    const activeRow = screen.getByText("Active Contract").closest("tr");
    expect(activeRow).not.toBeNull();

    await user.click(
      within(activeRow as HTMLTableRowElement).getByRole("button", { name: /open menu/i }),
    );

    expect(screen.getByRole("menuitem", { name: "Expire" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Terminate" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    const draftRow = screen.getByText("Draft Contract").closest("tr");
    expect(draftRow).not.toBeNull();

    await user.click(
      within(draftRow as HTMLTableRowElement).getByRole("button", { name: /open menu/i }),
    );

    expect(screen.queryByRole("menuitem", { name: "Expire" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Activate" })).toBeInTheDocument();
  });
});
