import { api } from '@/lib/api-client';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

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

export function getAllowedLeadTransitions(status: SalesLeadStatus) {
  return LEAD_STATUS_TRANSITIONS[status] ?? [];
}

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

export interface SalesLeadListItem {
  id: number;
  licence_number: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  status: SalesLeadStatus;
  created_at: string;
}

export interface SalesLeadRead extends SalesLeadListItem {
  contact_phone: string | null;
  source: string | null;
  initial_message: string | null;
  assigned_sales_user_id: number | null;
  next_action: string | null;
  next_action_due_at: string | null;
  updated_at: string;
}

export interface SalesLeadListResponse {
  items: SalesLeadListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface PublicLeadCreatePayload {
  licence_number: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  initial_message?: string;
  source?: string;
}

export interface PublicLeadCreateResponse {
  id: number;
  licence_number: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  initial_message: string | null;
  status: SalesLeadStatus;
  created_at: string;
}

export interface LeadConsultationCreatePayload {
  scheduled_at: string;
  duration_minutes: number;
  location: string;
  meeting_link?: string;
}

export interface LeadConsultationRead {
  id: number;
  lead_id: number;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  location: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  created_by_user_id: number;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by_actor: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export interface SalesLeadStatusHistoryItem {
  id: number;
  lead_id: number;
  old_status: SalesLeadStatus | null;
  new_status: SalesLeadStatus;
  changed_by_user_id: number;
  changed_at: string;
  reason: string | null;
}

export interface SalesLeadStatusHistoryListResponse {
  items: SalesLeadStatusHistoryItem[];
  total: number;
  page?: number;
  page_size?: number;
}

export interface LeadConsultationListResponse {
  items: LeadConsultationRead[];
  total: number;
  page: number;
  page_size: number;
}

export interface ConsultationTransitionPayload {
  new_status: 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  cancellation_reason?: string;
  cancelled_by_actor?: 'LEAD' | 'SALES';
}

export const salesLeadsService = {
  createPublicLead: (payload: PublicLeadCreatePayload) =>
    api.post<PublicLeadCreateResponse>('/api/leads', payload),

  listLeads: (params: {
    page: number;
    page_size: number;
    status?: SalesLeadStatus;
    source?: string;
    search?: string;
    sort?: string;
  }) => {
    const q = new URLSearchParams({
      page: String(params.page),
      page_size: String(params.page_size),
    });
    if (params.status) q.set('status', params.status);
    if (params.source) q.set('source', params.source);
    if (params.search) q.set('search', params.search);
    if (params.sort) q.set('sort', params.sort);
    return api.get<SalesLeadListResponse>(
      `/api/leads?${q.toString()}`
    );
  },

  listMyLeads: (params: {
    page: number;
    page_size: number;
    status?: SalesLeadStatus;
    source?: string;
    search?: string;
    sort?: string;
  }) => {
    const q = new URLSearchParams({
      page: String(params.page),
      page_size: String(params.page_size),
    });
    if (params.status) q.set('status', params.status);
    if (params.source) q.set('source', params.source);
    if (params.search) q.set('search', params.search);
    if (params.sort) q.set('sort', params.sort);
    return api.get<SalesLeadListResponse>(
      `/api/leads/my-leads?${q.toString()}`
    );
  },

  getLead: (leadId: number) =>
    api.get<SalesLeadRead>(`/api/leads/${leadId}`),

  claimLead: (leadId: number) =>
    api.post<SalesLeadRead>(
      `/api/leads/${leadId}/owner?action=claim`
    ),

  releaseLead: (leadId: number) =>
    api.post<SalesLeadRead>(
      `/api/leads/${leadId}/owner?action=release`
    ),

  transitionLead: (
    leadId: number,
    new_status: SalesLeadStatus,
    reason?: string
  ) =>
    api.post<SalesLeadRead>(`/api/leads/${leadId}/transition`, {
      new_status,
      reason,
    }),

  createLeadConsultation: (
    leadId: number,
    payload: LeadConsultationCreatePayload
  ) =>
    api.post<LeadConsultationRead>(
      `/api/leads/${leadId}/consultations`,
      payload
    ),

  listLeadConsultations: (params: {
    leadId: number;
    page?: number;
    page_size?: number;
  }) => {
    const q = new URLSearchParams({
      page: String(params.page ?? 1),
      page_size: String(params.page_size ?? 20),
    });
    return api.get<LeadConsultationListResponse>(
      `/api/leads/${params.leadId}/consultations?${q.toString()}`
    );
  },

  transitionConsultation: (
    consultationId: number,
    payload: ConsultationTransitionPayload
  ) =>
    api.post<LeadConsultationRead>(
      `/api/consultations/${consultationId}/transition`,
      payload
    ),

  getLeadStatusHistory: (leadId: number) =>
    api.get<SalesLeadStatusHistoryListResponse>(
      `/api/leads/${leadId}/history`
    ),
};

export function useSalesLeads(params: {
  scope: 'all' | 'mine';
  page: number;
  pageSize: number;
  status?: SalesLeadStatus;
  source?: string;
  search?: string;
  sort?: string;
}) {
  return useQuery({
    queryKey: ['sales-leads', params],
    queryFn: () =>
      params.scope === 'mine'
        ? salesLeadsService.listMyLeads({
            page: params.page,
            page_size: params.pageSize,
            status: params.status,
            source: params.source,
            search: params.search,
            sort: params.sort,
          })
        : salesLeadsService.listLeads({
            page: params.page,
            page_size: params.pageSize,
            status: params.status,
            source: params.source,
            search: params.search,
            sort: params.sort,
          }),
  });
}

export function useSalesLead(leadId: number | null) {
  return useQuery({
    queryKey: ['sales-lead', leadId],
    queryFn: () => salesLeadsService.getLead(leadId!),
    enabled: leadId !== null,
  });
}

export function useLeadStatusHistory(leadId: number | null) {
  return useQuery({
    queryKey: ['sales-lead-history', leadId],
    queryFn: () => salesLeadsService.getLeadStatusHistory(leadId!),
    enabled: leadId !== null,
    retry: false,
  });
}

function invalidateLeadQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
  queryClient.invalidateQueries({ queryKey: ['sales-lead'] });
  queryClient.invalidateQueries({
    queryKey: ['sales-lead-history'],
  });
}

export function useClaimLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: number) =>
      salesLeadsService.claimLead(leadId),
    onSuccess: () => invalidateLeadQueries(queryClient),
  });
}

export function useReleaseLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: number) =>
      salesLeadsService.releaseLead(leadId),
    onSuccess: () => invalidateLeadQueries(queryClient),
  });
}

export function useTransitionLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      leadId: number;
      nextStatus: SalesLeadStatus;
      reason?: string;
    }) =>
      salesLeadsService.transitionLead(
        params.leadId,
        params.nextStatus,
        params.reason
      ),
    onSuccess: () => invalidateLeadQueries(queryClient),
  });
}

export function useCreateLeadConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      leadId: number;
      payload: LeadConsultationCreatePayload;
    }) =>
      salesLeadsService.createLeadConsultation(
        params.leadId,
        params.payload
      ),
    onSuccess: () => invalidateLeadQueries(queryClient),
  });
}

export function useCompleteLatestLeadConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: number) => {
      const list = await salesLeadsService.listLeadConsultations({
        leadId,
        page: 1,
        page_size: 50,
      });
      const latestScheduled = list.items.find(
        (c) => c.status === 'SCHEDULED'
      );
      if (!latestScheduled) {
        throw new Error(
          `No SCHEDULED consultation booking found for lead ${leadId}`
        );
      }
      return salesLeadsService.transitionConsultation(
        latestScheduled.id,
        { new_status: 'COMPLETED' }
      );
    },
    onSuccess: () => invalidateLeadQueries(queryClient),
  });
}
