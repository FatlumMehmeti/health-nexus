import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useClaimPlaceholderLead,
  useMyPlaceholderLeads,
  usePlaceholderLeads,
  useReleasePlaceholderLead,
} from '@/services/leads.placeholder';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

/**
 * Sales lead inbox list view for:
 * - /dashboard/sales/leads (all leads)
 * - /dashboard/sales/my-leads (owned leads)
 *
 * Deep lead work happens on a dedicated detail page:
 * /dashboard/sales/leads/$leadId
 */
function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      {status}
    </span>
  );
}

export default function SalesLeadsInbox({
  scope = 'all',
}: {
  scope?: 'all' | 'mine';
}) {
  const PAGE_SIZE = 5;
  const user = useAuthStore((s) => s.user);
  const { data: allLeads = [] } = usePlaceholderLeads();
  const { data: myLeads = [] } = useMyPlaceholderLeads(user?.id);
  const leadsBase = scope === 'mine' ? myLeads : allLeads;
  const claimLead = useClaimPlaceholderLead();
  const releaseLead = useReleasePlaceholderLead();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [page, setPage] = useState(1);

  const statusOptions = useMemo(
    () => [
      'ALL',
      ...Array.from(new Set(leadsBase.map((l) => l.status))),
    ],
    [leadsBase]
  );
  const sourceOptions = useMemo(
    () => [
      'ALL',
      ...Array.from(
        new Set(leadsBase.map((l) => l.source || 'UNKNOWN'))
      ),
    ],
    [leadsBase]
  );

  // Client-side filter/sort pipeline mirrors planned backend query params
  // so this can be replaced by API-side filtering later with minimal UI changes.
  const leads = useMemo(() => {
    let items = [...leadsBase];
    const q = search.trim().toLowerCase();

    if (q) {
      items = items.filter((lead) =>
        [
          lead.organization_name,
          lead.contact_name,
          lead.contact_email,
          lead.licence_number,
          lead.source,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      items = items.filter((lead) => lead.status === statusFilter);
    }

    if (sourceFilter !== 'ALL') {
      items = items.filter(
        (lead) => (lead.source || 'UNKNOWN') === sourceFilter
      );
    }

    if (ownershipFilter !== 'ALL') {
      items = items.filter((lead) => {
        const isUnassigned = !lead.assigned_sales_user_id;
        const isMine = lead.assigned_sales_user_id === user?.id;
        if (ownershipFilter === 'UNASSIGNED') return isUnassigned;
        if (ownershipFilter === 'MINE') return isMine;
        if (ownershipFilter === 'ASSIGNED')
          return !!lead.assigned_sales_user_id;
        if (ownershipFilter === 'OTHERS')
          return !!lead.assigned_sales_user_id && !isMine;
        return true;
      });
    }

    if (sortBy === 'OLDEST') {
      items.sort((a, b) => a.created_at.localeCompare(b.created_at));
    } else if (sortBy === 'ORG_AZ') {
      items.sort((a, b) =>
        a.organization_name.localeCompare(b.organization_name)
      );
    } else {
      items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    return items;
  }, [
    leadsBase,
    ownershipFilter,
    search,
    sortBy,
    sourceFilter,
    statusFilter,
    user?.id,
  ]);

  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const pagedLeads = useMemo(
    () => leads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [leads, page]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    // Reset to first page whenever filter criteria change.
    setPage(1);
  }, [search, statusFilter, ownershipFilter, sourceFilter, sortBy]);

  const handleClaim = async (leadId: string) => {
    if (!user) return;
    try {
      await claimLead.mutateAsync({
        localId: leadId,
        salesUserId: user.id,
        salesEmail: user.email,
      });
      toast.success('Lead claimed');
    } catch {
      toast.error('Failed to claim lead');
    }
  };

  const handleRelease = async (leadId: string) => {
    try {
      await releaseLead.mutateAsync(leadId);
      toast.success('Lead released');
    } catch {
      toast.error('Failed to release lead');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {scope === 'mine' ? 'My Leads' : 'Sales Leads Inbox'}
          </CardTitle>
          <CardDescription>
            {scope === 'mine'
              ? 'Leads currently assigned to you.'
              : 'Placeholder sales view of leads from seed data and public consultation requests.'}
          </CardDescription>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant={scope === 'all' ? 'default' : 'outline'}
              onClick={() =>
                navigate({
                  to: '/dashboard/sales/leads',
                })
              }
            >
              Leads
            </Button>
            <Button
              size="sm"
              variant={scope === 'mine' ? 'default' : 'outline'}
              onClick={() =>
                navigate({
                  to: '/dashboard/sales/my-leads',
                })
              }
            >
              My Leads
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Search
              </p>
              <Input
                placeholder="Org, contact, email, licence..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Status
              </p>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Ownership
              </p>
              <Select
                value={ownershipFilter}
                onValueChange={setOwnershipFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All ownership" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  <SelectItem value="UNASSIGNED">
                    UNASSIGNED
                  </SelectItem>
                  <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
                  <SelectItem value="MINE">MINE</SelectItem>
                  <SelectItem value="OTHERS">OTHERS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Source
              </p>
              <Select
                value={sourceFilter}
                onValueChange={setSourceFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Sort
              </p>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEWEST">NEWEST</SelectItem>
                  <SelectItem value="OLDEST">OLDEST</SelectItem>
                  <SelectItem value="ORG_AZ">ORG A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-3 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Filter Guide:
            </span>{' '}
            `UNASSIGNED` = ready to claim, `MINE` = owned by you,
            `OTHERS` = assigned to another sales user.
          </div>

          <div className="mb-3 text-xs text-muted-foreground">
            Showing {leads.length} filtered lead
            {leads.length === 1 ? '' : 's'}
          </div>

          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {scope === 'mine'
                ? 'No leads assigned to you yet. Claim one from Leads.'
                : 'No leads yet. Submit a consultation request from `/register` to see items here.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              {/* Row click navigates to dedicated detail route for deep lead workflow. */}
              <table className="w-full text-sm">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">
                      Organization
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Contact
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Owner
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Created
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLeads.map((lead) => {
                    const isMine =
                      lead.assigned_sales_user_id === user?.id;
                    const hasOwner = !!lead.assigned_sales_user_id;
                    return (
                      <tr
                        key={lead.local_id}
                        className="cursor-pointer border-t transition-colors hover:bg-muted/30"
                        onClick={() =>
                          navigate({
                            to: '/dashboard/sales/leads/$leadId',
                            params: {
                              leadId: lead.local_id,
                            },
                          })
                        }
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium">
                            {lead.organization_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {lead.licence_number}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div>{lead.contact_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {lead.contact_email}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <StatusPill status={lead.status} />
                        </td>
                        <td className="px-3 py-2 align-top">
                          {lead.assigned_sales_email ?? 'Unassigned'}
                        </td>
                        <td className="px-3 py-2 align-top text-muted-foreground">
                          {new Date(lead.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right align-top">
                          {isMine ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRelease(lead.local_id);
                              }}
                              disabled={releaseLead.isPending}
                            >
                              Release
                            </Button>
                          ) : scope === 'mine' ? (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClaim(lead.local_id);
                              }}
                              disabled={
                                hasOwner || claimLead.isPending
                              }
                            >
                              Claim
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {leads.length > PAGE_SIZE ? (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
