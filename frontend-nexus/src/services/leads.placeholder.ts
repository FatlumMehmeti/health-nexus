import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

/**
 * Placeholder sales lead store for PRD-08 frontend development.
 *
 * Why this exists:
 * - Backend lead endpoints are still in progress.
 * - Sales UI needs realistic behavior now (listing, claiming, transitions).
 *
 * Migration path:
 * - Keep the same hook signatures.
 * - Swap internal read/write/transition functions with real API calls later.
 */
const STORAGE_KEY = 'health-nexus.placeholderLeads';

export type SalesLeadStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'CONTACTED'
  | 'CONSULTATION_SCHEDULED'
  | 'CONSULTATION_COMPLETED'
  | 'AWAITING_DECISION'
  | 'CONVERTED'
  | 'REJECTED'
  | 'LOST';

export const LEAD_STATUS_TRANSITIONS: Record<
  SalesLeadStatus,
  SalesLeadStatus[]
> = {
  NEW: ['QUALIFIED', 'REJECTED'],
  QUALIFIED: ['CONTACTED', 'LOST', 'REJECTED'],
  CONTACTED: ['CONSULTATION_SCHEDULED', 'LOST', 'REJECTED'],
  CONSULTATION_SCHEDULED: [
    'CONSULTATION_COMPLETED',
    'CONTACTED',
    'REJECTED',
  ],
  CONSULTATION_COMPLETED: [
    'AWAITING_DECISION',
    'CONVERTED',
    'LOST',
    'REJECTED',
  ],
  AWAITING_DECISION: ['CONVERTED', 'LOST', 'CONTACTED', 'REJECTED'],
  CONVERTED: [],
  REJECTED: [],
  LOST: [],
};

/** Ordered PRD-08 sales pipeline sequence used by roadmap/stepper UIs. */
export const SALES_PIPELINE_ORDER: SalesLeadStatus[] = [
  'NEW',
  'QUALIFIED',
  'CONTACTED',
  'CONSULTATION_SCHEDULED',
  'CONSULTATION_COMPLETED',
  'AWAITING_DECISION',
  'CONVERTED',
];

export type RoadmapStepState = 'DONE' | 'IN_PROGRESS' | 'NOT_STARTED';

export interface LeadRoadmapStep {
  status: SalesLeadStatus | 'REJECTED' | 'LOST';
  state: RoadmapStepState;
}

/** Central transition matrix used by both UI hints and transition validation. */
export function getAllowedLeadTransitions(status: SalesLeadStatus) {
  return LEAD_STATUS_TRANSITIONS[status] ?? [];
}

/**
 * Convert current status into visual roadmap states.
 * This helper is shared by sales and public tracking views for consistent UX.
 */
export function buildLeadRoadmap(
  status: SalesLeadStatus
): LeadRoadmapStep[] {
  if (status === 'REJECTED' || status === 'LOST') {
    const baseSteps: LeadRoadmapStep[] = SALES_PIPELINE_ORDER.map(
      (step, idx) => ({
        status: step,
        state: idx === 0 ? 'DONE' : 'NOT_STARTED',
      })
    );
    return baseSteps.concat([{ status, state: 'IN_PROGRESS' }]);
  }

  const currentIndex = SALES_PIPELINE_ORDER.indexOf(status);
  return SALES_PIPELINE_ORDER.map((step, idx) => ({
    status: step,
    state:
      idx < currentIndex
        ? 'DONE'
        : idx === currentIndex
          ? 'IN_PROGRESS'
          : 'NOT_STARTED',
  }));
}

export interface PlaceholderLead {
  local_id: string;
  backend_id?: number | string | null;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  licence_number: string;
  source: string;
  initial_message?: string;
  status: SalesLeadStatus;
  assigned_sales_user_id: string | null;
  assigned_sales_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceholderLeadInput {
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  licence_number: string;
  source: string;
  initial_message?: string;
  backend_id?: number | string | null;
}

const DEFAULT_SEED_LEADS: PlaceholderLead[] = [
  {
    local_id: 'seed-lead-001',
    backend_id: null,
    organization_name: 'North Star Medical',
    contact_name: 'Elena Brooks',
    contact_email: 'elena@northstarmed.com',
    contact_phone: '+1 555 201 7781',
    licence_number: 'NSM-2026-001',
    source: 'WEBSITE',
    initial_message:
      'We want a walkthrough for onboarding our first clinic.',
    status: 'NEW',
    assigned_sales_user_id: null,
    assigned_sales_email: null,
    created_at: '2026-03-07T09:30:00.000Z',
    updated_at: '2026-03-07T09:30:00.000Z',
  },
  {
    local_id: 'seed-lead-002',
    backend_id: null,
    organization_name: 'Blue Valley Health',
    contact_name: 'Marco Hayes',
    contact_email: 'marco@bluevalleyhealth.com',
    contact_phone: '+1 555 834 0092',
    licence_number: 'BVH-2026-112',
    source: 'REFERRAL',
    initial_message:
      'Interested in consultation scheduling and sales workflow demo.',
    status: 'QUALIFIED',
    assigned_sales_user_id: null,
    assigned_sales_email: null,
    created_at: '2026-03-06T15:00:00.000Z',
    updated_at: '2026-03-06T15:00:00.000Z',
  },
  {
    local_id: 'seed-lead-003',
    backend_id: null,
    organization_name: 'Harborline Clinic Group',
    contact_name: 'Nina Patel',
    contact_email: 'nina@harborlineclinic.com',
    contact_phone: '+1 555 402 1188',
    licence_number: 'HLC-4401',
    source: 'MARKETING',
    initial_message: 'Need pricing and implementation timeline.',
    status: 'CONTACTED',
    assigned_sales_user_id: 'seed-sales-002',
    assigned_sales_email: 'sales.backup@seed.com',
    created_at: '2026-03-05T11:45:00.000Z',
    updated_at: '2026-03-06T11:00:00.000Z',
  },
];

/** Seed initial local leads once to make the Sales UI usable immediately. */
function ensureSeedData() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(DEFAULT_SEED_LEADS)
  );
}

function readLeads(): PlaceholderLead[] {
  try {
    ensureSeedData();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlaceholderLead[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLeads(leads: PlaceholderLead[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

export function savePlaceholderLead(
  input: PlaceholderLeadInput
): PlaceholderLead {
  const now = new Date().toISOString();
  const lead: PlaceholderLead = {
    local_id: `lead_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    backend_id: input.backend_id ?? null,
    organization_name: input.organization_name,
    contact_name: input.contact_name,
    contact_email: input.contact_email,
    contact_phone: input.contact_phone,
    licence_number: input.licence_number,
    source: input.source,
    initial_message: input.initial_message,
    status: 'NEW',
    assigned_sales_user_id: null,
    assigned_sales_email: null,
    created_at: now,
    updated_at: now,
  };
  const leads = readLeads();
  leads.unshift(lead);
  writeLeads(leads);
  return lead;
}

export function listPlaceholderLeads(): PlaceholderLead[] {
  return readLeads().sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
}

export function listMyPlaceholderLeads(salesUserId: string) {
  return listPlaceholderLeads().filter(
    (lead) => lead.assigned_sales_user_id === salesUserId
  );
}

/** Generic lead updater used by claim/release/transition operations. */
function updateLead(
  localId: string,
  updater: (lead: PlaceholderLead) => PlaceholderLead
) {
  const leads = readLeads();
  const idx = leads.findIndex((l) => l.local_id === localId);
  if (idx < 0) return;
  leads[idx] = updater(leads[idx]!);
  writeLeads(leads);
}

function claimPlaceholderLead(params: {
  localId: string;
  salesUserId: string;
  salesEmail: string;
}) {
  updateLead(params.localId, (lead) => ({
    ...lead,
    assigned_sales_user_id: params.salesUserId,
    assigned_sales_email: params.salesEmail,
    updated_at: new Date().toISOString(),
  }));
  return true;
}

function releasePlaceholderLead(localId: string) {
  updateLead(localId, (lead) => ({
    ...lead,
    assigned_sales_user_id: null,
    assigned_sales_email: null,
    updated_at: new Date().toISOString(),
  }));
  return true;
}

function transitionPlaceholderLead(params: {
  localId: string;
  nextStatus: SalesLeadStatus;
}) {
  let updated = false;
  updateLead(params.localId, (lead) => {
    const allowed = getAllowedLeadTransitions(lead.status);
    if (!allowed.includes(params.nextStatus)) {
      throw new Error(
        `Invalid transition: ${lead.status} -> ${params.nextStatus}`
      );
    }
    updated = true;
    return {
      ...lead,
      status: params.nextStatus,
      updated_at: new Date().toISOString(),
    };
  });
  if (!updated) {
    throw new Error('Lead not found');
  }
  return true;
}

/** Placeholder "all leads" query (future: GET /leads). */
export function usePlaceholderLeads() {
  return useQuery({
    queryKey: ['placeholder-leads'],
    queryFn: listPlaceholderLeads,
    staleTime: 0,
  });
}

/** Placeholder "my leads" query (future: GET /leads/my). */
export function useMyPlaceholderLeads(
  salesUserId: string | undefined
) {
  return useQuery({
    queryKey: ['placeholder-leads', 'mine', salesUserId],
    queryFn: () =>
      salesUserId ? listMyPlaceholderLeads(salesUserId) : [],
    enabled: !!salesUserId,
    staleTime: 0,
  });
}

/** Placeholder claim mutation (future: POST /leads/{lead_id}/claim). */
export function useClaimPlaceholderLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      localId: string;
      salesUserId: string;
      salesEmail: string;
    }) => claimPlaceholderLead(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['placeholder-leads'],
      });
    },
  });
}

/** Placeholder release mutation (future: POST /leads/{lead_id}/release). */
export function useReleasePlaceholderLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (localId: string) =>
      releasePlaceholderLead(localId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['placeholder-leads'],
      });
    },
  });
}

/** Placeholder status transition mutation (future: POST /leads/{lead_id}/transition). */
export function useTransitionPlaceholderLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      localId: string;
      nextStatus: SalesLeadStatus;
    }) => transitionPlaceholderLead(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['placeholder-leads'],
      });
    },
  });
}
