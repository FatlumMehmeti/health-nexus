import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requireAuth } from '@/lib/guards/requireAuth';
import {
  buildLeadRoadmap,
  getAllowedLeadTransitions,
  type SalesLeadStatus,
  useClaimPlaceholderLead,
  usePlaceholderLeads,
  useReleasePlaceholderLead,
  useTransitionPlaceholderLead,
} from '@/services/leads.placeholder';
import { useAuthStore } from '@/stores/auth.store';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Building2,
  CalendarClock,
  Mail,
  Phone,
  User2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

/** Dedicated lead detail page for deep sales work (claim + status transitions). */
export const Route = createFileRoute(
  '/dashboard/sales/leads/$leadId'
)({
  beforeLoad: requireAuth({
    routeKey: 'DASHBOARD_SALES_LEADS',
  }),
  component: SalesLeadDetailsPage,
});

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      {status}
    </span>
  );
}

function roadmapStepClass(
  state: 'DONE' | 'IN_PROGRESS' | 'NOT_STARTED'
) {
  if (state === 'DONE') {
    return 'border-green-500/40 bg-green-500/10 text-green-300';
  }
  if (state === 'IN_PROGRESS') {
    return 'border-orange-500/40 bg-orange-500/10 text-orange-300';
  }
  return 'border-border bg-muted/20 text-muted-foreground';
}

function SalesLeadDetailsPage() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: leads = [] } = usePlaceholderLeads();
  const claimLead = useClaimPlaceholderLead();
  const releaseLead = useReleasePlaceholderLead();
  const transitionLead = useTransitionPlaceholderLead();

  const lead = useMemo(
    () => leads.find((item) => item.local_id === leadId) ?? null,
    [leadId, leads]
  );
  const [nextStatus, setNextStatus] = useState<SalesLeadStatus | ''>(
    ''
  );

  if (!lead) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead not found</CardTitle>
            <CardDescription>
              This lead may have been removed or does not exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() =>
                navigate({
                  to: '/dashboard/sales/leads',
                })
              }
            >
              Back to Leads
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMine = lead.assigned_sales_user_id === user?.id;
  const hasOwner = !!lead.assigned_sales_user_id;
  const allowedTransitions = getAllowedLeadTransitions(lead.status);
  const roadmap = buildLeadRoadmap(lead.status);

  const ownershipInsight = !lead.assigned_sales_user_id
    ? {
        label: 'High Priority',
        variant: 'warning' as const,
        text: 'Unassigned lead ready to claim',
      }
    : isMine
      ? {
          label: 'Your Lead',
          variant: 'success' as const,
          text: 'Currently in your pipeline',
        }
      : {
          label: 'Locked',
          variant: 'neutral' as const,
          text: `Assigned to ${lead.assigned_sales_email}`,
        };

  const handleClaim = async () => {
    if (!user) return;
    try {
      await claimLead.mutateAsync({
        localId: lead.local_id,
        salesUserId: user.id,
        salesEmail: user.email,
      });
      toast.success('Lead claimed');
    } catch {
      toast.error('Failed to claim lead');
    }
  };

  const handleRelease = async () => {
    try {
      await releaseLead.mutateAsync(lead.local_id);
      toast.success('Lead released');
    } catch {
      toast.error('Failed to release lead');
    }
  };

  const handleTransition = async () => {
    if (!nextStatus) return;
    try {
      await transitionLead.mutateAsync({
        localId: lead.local_id,
        nextStatus,
      });
      setNextStatus('');
      toast.success(`Status updated to ${nextStatus}`);
    } catch (err) {
      toast.error(
        (err as Error).message || 'Failed to update status'
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lead Details</h1>
          <p className="text-sm text-muted-foreground">
            {lead.organization_name}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            navigate({
              to: '/dashboard/sales/leads',
            })
          }
        >
          Back to Leads
        </Button>
      </div>

      <Card className="border-primary/20 py-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/8 via-transparent to-transparent pt-5 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            Lead Insights
          </CardTitle>
          <CardDescription>
            Dedicated detail view for ownership and stage progression.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={lead.status} />
            <Badge variant={ownershipInsight.variant}>
              {ownershipInsight.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {ownershipInsight.text}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Organization
              </p>
              <p className="mt-1 text-base font-semibold">
                {lead.organization_name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Licence: {lead.licence_number}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contact
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <User2 className="size-4 text-muted-foreground" />
                {lead.contact_name}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                {lead.contact_email}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <Phone className="size-4 text-muted-foreground" />
                {lead.contact_phone || 'Not provided'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Owner</p>
              <p className="mt-1 text-sm font-medium">
                {lead.assigned_sales_email ?? 'Unassigned'}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Source</p>
              <p className="mt-1 text-sm font-medium">
                {lead.source}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">
                Created At
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                <CalendarClock className="size-4 text-muted-foreground" />
                {new Date(lead.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Initial Message
            </p>
            <p className="mt-2 text-sm text-foreground">
              {lead.initial_message ||
                'No message was provided by this lead.'}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ownership
            </p>
            <div className="mt-3 flex gap-2">
              {isMine ? (
                <Button
                  variant="outline"
                  onClick={handleRelease}
                  disabled={releaseLead.isPending}
                >
                  {releaseLead.isPending
                    ? 'Releasing...'
                    : 'Release Lead'}
                </Button>
              ) : (
                <Button
                  onClick={handleClaim}
                  disabled={hasOwner || claimLead.isPending}
                >
                  {claimLead.isPending ? 'Claiming...' : 'Claim Lead'}
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status Transition
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Allowed next steps from{' '}
              <span className="font-medium text-foreground">
                {lead.status}
              </span>
              :{' '}
              {allowedTransitions.length > 0
                ? allowedTransitions.join(', ')
                : 'Terminal status'}
            </p>

            {!isMine ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Claim this lead to change its status.
              </p>
            ) : allowedTransitions.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                This lead is in a terminal state.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Select
                  value={nextStatus}
                  onValueChange={(value) =>
                    setNextStatus(value as SalesLeadStatus)
                  }
                >
                  <SelectTrigger className="sm:w-64">
                    <SelectValue placeholder="Select next status" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="top"
                    align="start"
                  >
                    {allowedTransitions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleTransition}
                  disabled={!nextStatus || transitionLead.isPending}
                >
                  {transitionLead.isPending
                    ? 'Updating...'
                    : 'Update Status'}
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sales Roadmap
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Green = accomplished, orange = in progress, gray = not
              started.
            </p>
            <ol className="mt-3 grid gap-2 md:grid-cols-3">
              {roadmap.map((step) => (
                <li
                  key={step.status}
                  className={`rounded-md border p-3 text-sm ${roadmapStepClass(step.state)}`}
                >
                  <p className="font-semibold">{step.status}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide">
                    {step.state.replace('_', ' ')}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
