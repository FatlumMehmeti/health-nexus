/**
 * Public tenant landing with simple tabs:
 * HOME (hero/about) + DEPARTMENTS (table) implemented,
 * PRODUCTS placeholder; PLANS uses per‑tenant plans and allows
 * a visitor to choose one of the offered plans.
 *
 * When a TENANT_MANAGER is logged in, a simple "Manage plans" panel
 * is shown to create and edit tenant plans via the backend.
 *
 * Used by /landing/$tenantSlug (PRD-03).
 */
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { IconEdit } from '@tabler/icons-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'
import { tenantPlansService, type TenantPlanApi } from '@/services/tenant-plans.service'

export type TenantLandingConfig = Record<
  string,
  {
    title: string
    subtitle: string
    logo?: string
    moto?: string
    about?: string
    primaryFontClass?: string
    /** Backend tenant id; when set, client view fetches plans from API instead of mock. */
    tenantId?: number
    plans?: TenantPlan[]
  }
>

export interface TenantLandingProps {
  tenantSlug: string
  config: TenantLandingConfig
  backToHome?: ReactNode
}

type DepartmentRow = {
  name: string
  services: string
}

export type TenantPlan = {
  id?: string
  name: string
  description?: string
  price: number
  currency?: string
  durationDays?: number | null
  maxAppointments?: number | null
  maxConsultations?: number | null
  isActive?: boolean
}

const defaultDepartments: DepartmentRow[] = [
  { name: 'Cardiology', services: 'ECG, Echocardiography, Stress testing' },
  { name: 'Radiology', services: 'X-ray, CT, MRI, Ultrasound' },
  { name: 'Pediatrics', services: 'Well-child visits, vaccinations' },
]

export function TenantLanding({
  tenantSlug,
  config,
  backToHome,
}: TenantLandingProps) {
  const { role, tenantId } = useAuthStore()
  const isTenantManager = role === 'TENANT_MANAGER'
  const tenantNumericId = isTenantManager && tenantId ? Number(tenantId) : null

  const tenant = config[tenantSlug]
  const title = tenant?.title ?? `Tenant: ${tenantSlug}`
  const subtitle = tenant?.subtitle ?? 'Welcome to our landing page.'
  const logo = tenant?.logo
  const moto = tenant?.moto ?? 'Your health, our priority.'
  const about =
    tenant?.about ??
    'This is a sample description for the tenant landing page. Real content will come from the backend.'
  const fontClass = tenant?.primaryFontClass ?? 'font-sans'
  // Local state for plans; initially populated from backend (for managers) or static config.
  const [plans, setPlans] = useState<TenantPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined)

  // Inline form state for adding or editing a plan.
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanPrice, setNewPlanPrice] = useState('0')
  const [newPlanMaxAppointments, setNewPlanMaxAppointments] = useState('')
  const [newPlanMaxConsultations, setNewPlanMaxConsultations] = useState('')
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planFormError, setPlanFormError] = useState<string | null>(null)
  const formatPrice = (price: number, currency = 'EUR') =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(price)
  const formatDuration = (value?: number | null) => {
    if (!value) return 'Flexible'
    if (value === 1) return '1 day'
    return `${value} days`
  }
  const formatLimit = (value?: number | null, label?: string) => {
    if (value === null || value === undefined) return `Unlimited ${label ?? ''}`.trim()
    return `${value} ${label ?? ''}`.trim()
  }

  // Parse optional number from form string (empty = null).
  const parseOptionalInt = (s: string): number | null => {
    const trimmed = s.trim()
    if (trimmed === '') return null
    const n = Number(trimmed)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  // Create a plan for the current tenant manager and merge it into local state.
  const createPlanMutation = useMutation({
    mutationFn: async ({
      name,
      price,
      max_appointments,
      max_consultations,
    }: {
      name: string
      price: number
      max_appointments?: number | null
      max_consultations?: number | null
    }) => {
      if (!tenantNumericId) {
        throw new Error('Missing tenant id for plan creation')
      }
      const created = await tenantPlansService.create({
        tenant_id: tenantNumericId,
        name,
        price: Math.max(0.01, price),
        is_active: true,
        max_appointments: max_appointments ?? undefined,
        max_consultations: max_consultations ?? undefined,
      })
      return created
    },
    onSuccess: (apiPlan) => {
      const mapped = mapApiPlanToTenantPlan(apiPlan)
      setPlans((prev) => [...prev, mapped])
      setSelectedPlanId(mapped.id ?? mapped.name)
    },
  })

  // Update a single plan (name/price/visibility/limits) and keep local state in sync.
  const updatePlanMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: Partial<
        Pick<TenantPlanApi, 'name' | 'price' | 'is_active' | 'max_appointments' | 'max_consultations'>
      >
    }) => {
      const updated = await tenantPlansService.update(id, data)
      return updated
    },
    onSuccess: (apiPlan) => {
      const mapped = mapApiPlanToTenantPlan(apiPlan)
      setPlans((prev) => prev.map((p) => (p.id === String(apiPlan.id) ? mapped : p)))
    },
    onError: (_err, variables) => {
      // Revert optimistic toggle if backend update fails
      if (variables.data?.is_active !== undefined) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === String(variables.id)
              ? { ...p, isActive: !variables.data!.is_active }
              : p,
          ),
        )
      }
    },
  })

  // Delete a plan on the backend and remove from local state.
  const deletePlanMutation = useMutation({
    mutationFn: (id: number) => tenantPlansService.delete(id),
    onSuccess: (_data, id) => {
      setPlans((prev) => prev.filter((p) => p.id !== String(id)))
      if (editingPlanId === String(id)) {
        setEditingPlanId(null)
        setNewPlanName('')
        setNewPlanPrice('0')
        setNewPlanMaxAppointments('')
        setNewPlanMaxConsultations('')
      }
      const remaining = plans.filter((p) => p.id !== String(id))
      const firstActive = remaining.find((p) => p.isActive !== false)
      if (selectedPlanId === String(id)) {
        setSelectedPlanId(firstActive?.id ?? remaining[0]?.id)
      }
    },
  })

  // Normalize backend plan into the shape used by the landing UI.
  const mapApiPlanToTenantPlan = (apiPlan: TenantPlanApi): TenantPlan => ({
    id: String(apiPlan.id),
    name: apiPlan.name,
    description: apiPlan.description ?? undefined,
    price: apiPlan.price,
    currency: 'EUR',
    durationDays: apiPlan.duration ?? null,
    maxAppointments: apiPlan.max_appointments ?? null,
    maxConsultations: apiPlan.max_consultations ?? null,
    isActive: apiPlan.is_active !== false,
  })

  // When logged in as a tenant manager, hydrate plans from backend for the current tenant.
  const { data: backendPlans } = useQuery({
    queryKey: ['tenant-plans', tenantNumericId],
    enabled: Boolean(tenantNumericId),
    queryFn: () => tenantPlansService.listByTenant(tenantNumericId!),
  })

  // For clients: fetch plans from GET /user-tenant-plans/tenant/{tenantId} (active plans only).
  const clientTenantId = !isTenantManager && tenant?.tenantId != null ? tenant.tenantId : null
  const { data: clientPlans } = useQuery({
    queryKey: ['tenant-plans', clientTenantId],
    enabled: Boolean(clientTenantId),
    queryFn: () => tenantPlansService.listByTenant(clientTenantId!),
  })

  useEffect(() => {
    // For tenant managers, prefer backend plans when available
    if (tenantNumericId && backendPlans) {
      const mapped = backendPlans.map(mapApiPlanToTenantPlan)
      setPlans(mapped)
      if (mapped.length > 0) {
        const firstActive = mapped.find((p) => p.isActive !== false) ?? mapped[0]
        setSelectedPlanId(firstActive.id ?? firstActive.name)
      } else {
        setSelectedPlanId(undefined)
      }
      return
    }

    // For clients: use only API plans from GET /user-tenant-plans/tenant/{id}; no mock fallback.
    if (!tenantNumericId) {
      if (clientTenantId != null && clientPlans !== undefined) {
        const mapped = clientPlans.map(mapApiPlanToTenantPlan)
        setPlans(mapped)
        if (mapped.length > 0) {
          const firstActive = mapped.find((p) => p.isActive !== false) ?? mapped[0]
          setSelectedPlanId(firstActive.id ?? firstActive.name)
        } else {
          setSelectedPlanId(undefined)
        }
      } else {
        setPlans([])
        setSelectedPlanId(undefined)
      }
    }
  }, [tenantNumericId, backendPlans, clientTenantId, clientPlans, tenant])

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={title}
                className="h-9 w-9 rounded-lg object-contain"
              />
            ) : (
              <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold">
                {title
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-semibold sm:text-base">{title}</span>
              <span className="text-xs text-muted-foreground sm:text-[0.8rem]">
                {subtitle}
              </span>
            </div>
          </div>
          {backToHome ? (
            <div className="text-xs text-muted-foreground sm:text-sm">
              {backToHome}
            </div>
          ) : null}
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Tabs defaultValue="home" className="flex flex-1 flex-col gap-6">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="home">HOME</TabsTrigger>
            <TabsTrigger value="departments">DEPARTMENTS</TabsTrigger>
            <TabsTrigger value="products">PRODUCTS</TabsTrigger>
            <TabsTrigger value="plans">PLANS</TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="mt-0 flex-1">
            <section className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row">
              <div className="flex-1 space-y-4 lg:space-y-6">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                  {moto}
                </p>
                <h1
                  className={`${fontClass} text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl`}
                >
                  {title}
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {about}
                </p>
              </div>
              <aside className="mt-4 flex flex-1 flex-col gap-3 rounded-xl border bg-card/60 p-4 text-sm shadow-sm sm:p-5 lg:mt-0 lg:max-w-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  At a glance
                </h2>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Tenant slug:</span>{' '}
                    <code className="rounded bg-muted px-1 text-xs">{tenantSlug}</code>
                  </p>
                  <p className="text-muted-foreground">
                    This section will later show real metrics like locations, phone, and opening
                    hours, driven from backend tenant details.
                  </p>
                </div>
              </aside>
            </section>
          </TabsContent>

          <TabsContent value="departments" className="mt-0 flex-1">
            <section className="mx-auto max-w-5xl space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Departments & services
                </h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Static demo data for now; will be replaced with real departments and services from
                  the API.
                </p>
              </div>

              <div className="rounded-xl border bg-card/60 p-3 shadow-sm sm:p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Department</TableHead>
                      <TableHead>Services</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {defaultDepartments.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.services}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableCaption className="text-xs sm:text-sm">
                    Example layout – connect this table to tenant departments once backend is ready.
                  </TableCaption>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="products" className="mt-0 flex-1">
            <section className="mx-auto max-w-3xl space-y-3 text-center">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Products – coming soon
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                This tab will showcase healthcare products, packages, or featured services offered by
                the tenant once product data is available.
              </p>
            </section>
          </TabsContent>

          <TabsContent value="plans" className="mt-0 flex-1">
            <section className="mx-auto max-w-5xl space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Plans & memberships
                </h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Explore tenant-specific pricing and coverage limits for care packages.
                </p>
              </div>

              {isTenantManager && (
                <section className="space-y-4 rounded-xl border bg-card/60 p-4 text-xs sm:text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold sm:text-base">Manage plans</h3>
                      <p className="text-xs text-muted-foreground sm:text-[0.8rem]">
                        Add plans and toggle visibility. Changes are saved to the backend.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[2fr,1fr,1fr,1fr,auto,auto] sm:items-end">
                    <div className="space-y-1">
                      <Label htmlFor="new-plan-name" className="text-xs">
                        Plan name
                      </Label>
                      <Input
                        id="new-plan-name"
                        value={newPlanName}
                        onChange={(e) => {
                          setNewPlanName(e.target.value)
                          setPlanFormError(null)
                        }}
                        placeholder="e.g. Family Plus"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-plan-price" className="text-xs">
                        Price (EUR)
                      </Label>
                      <Input
                        id="new-plan-price"
                        type="number"
                        min={0}
                        step={1}
                        value={newPlanPrice}
                        onChange={(e) => {
                          setNewPlanPrice(e.target.value)
                          setPlanFormError(null)
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-plan-max-appointments" className="text-xs">
                        Max appointments
                      </Label>
                      <Input
                        id="new-plan-max-appointments"
                        type="number"
                        min={0}
                        step={1}
                        value={newPlanMaxAppointments}
                        onChange={(e) => {
                          setNewPlanMaxAppointments(e.target.value)
                          setPlanFormError(null)
                        }}
                        placeholder="Unlimited"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-plan-max-consultations" className="text-xs">
                        Max consultations
                      </Label>
                      <Input
                        id="new-plan-max-consultations"
                        type="number"
                        min={0}
                        step={1}
                        value={newPlanMaxConsultations}
                        onChange={(e) => {
                          setNewPlanMaxConsultations(e.target.value)
                          setPlanFormError(null)
                        }}
                        placeholder="Unlimited"
                        className="h-8 text-xs"
                      />
                    </div>
                    {planFormError && (
                      <p className="text-xs text-destructive sm:col-span-full">{planFormError}</p>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2 sm:mt-0"
                      onClick={async () => {
                        setPlanFormError(null)
                        const trimmedName = newPlanName.trim()
                        if (!trimmedName) {
                          setPlanFormError('Plan name is required.')
                          return
                        }
                        const priceNumber = Number(newPlanPrice)
                        const price = Number.isFinite(priceNumber) ? priceNumber : 0
                        const maxAppt = parseOptionalInt(newPlanMaxAppointments)
                        const maxCons = parseOptionalInt(newPlanMaxConsultations)

                        if (price <= 0) {
                          setPlanFormError('Price must be greater than 0.')
                          return
                        }
                        if (maxAppt !== null && maxAppt <= 0) {
                          setPlanFormError('Max appointments must be at least 1, or leave empty for unlimited.')
                          return
                        }
                        if (maxCons !== null && maxCons <= 0) {
                          setPlanFormError('Max consultations must be at least 1, or leave empty for unlimited.')
                          return
                        }

                        if (editingPlanId) {
                          const numericId = Number(editingPlanId)
                          await updatePlanMutation.mutateAsync({
                            id: numericId,
                            data: {
                              name: trimmedName,
                              price,
                              max_appointments: maxAppt ?? undefined,
                              max_consultations: maxCons ?? undefined,
                            },
                          })
                          setEditingPlanId(null)
                        } else {
                          await createPlanMutation.mutateAsync({
                            name: trimmedName,
                            price,
                            max_appointments: maxAppt ?? undefined,
                            max_consultations: maxCons ?? undefined,
                          })
                        }
                        setNewPlanName('')
                        setNewPlanPrice('0')
                        setNewPlanMaxAppointments('')
                        setNewPlanMaxConsultations('')
                      }}
                    >
                      {editingPlanId ? 'Save changes' : 'Add plan'}
                    </Button>
                    {editingPlanId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-2 sm:mt-0"
                        onClick={() => {
                          setEditingPlanId(null)
                          setNewPlanName('')
                          setNewPlanPrice('0')
                          setNewPlanMaxAppointments('')
                          setNewPlanMaxConsultations('')
                          setPlanFormError(null)
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>

                  {plans.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[0.7rem] font-medium text-muted-foreground">
                        Existing plans (edit, toggle visibility, or remove):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {plans.map((plan) => {
                          const key = plan.id ?? plan.name
                          const isEditing = editingPlanId === key
                          return (
                            <div
                              key={key}
                              className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-2 py-1"
                            >
                              <span className="text-[0.7rem] font-medium">{plan.name}</span>
                              <span className="text-[0.7rem] text-muted-foreground">
                                {formatPrice(plan.price, plan.currency)}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 text-[0.65rem]"
                                onClick={() => {
                                  setPlanFormError(null)
                                  setEditingPlanId(key)
                                  setNewPlanName(plan.name)
                                  setNewPlanPrice(String(plan.price ?? 0))
                                  setNewPlanMaxAppointments(
                                    plan.maxAppointments != null ? String(plan.maxAppointments) : '',
                                  )
                                  setNewPlanMaxConsultations(
                                    plan.maxConsultations != null
                                      ? String(plan.maxConsultations)
                                      : '',
                                  )
                                }}
                              >
                                <IconEdit
                                  className={`h-3 w-3 ${
                                    isEditing ? 'text-primary' : 'text-muted-foreground'
                                  }`}
                                />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 text-[0.65rem]"
                                onClick={() => {
                                  if (!plan.id) return
                                  const numericId = Number(plan.id)
                                  const nextActive = !plan.isActive
                                  setPlans((prev) =>
                                    prev.map((p) =>
                                      p.id === plan.id ? { ...p, isActive: nextActive } : p,
                                    ),
                                  )
                                  updatePlanMutation.mutate({
                                    id: numericId,
                                    data: { is_active: nextActive },
                                  })
                                }}
                              >
                                {plan.isActive === false ? 'Show' : 'Hide'}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-[0.65rem] text-destructive"
                                disabled={deletePlanMutation.isPending}
                                onClick={() => {
                                  const numericId = plan.id != null ? Number(plan.id) : NaN
                                  const isBackendPlan = Number.isFinite(numericId)
                                  if (isBackendPlan) {
                                    deletePlanMutation.mutate(numericId)
                                  } else {
                                    setPlans((prev) => {
                                      const next = prev.filter((p) => p !== plan)
                                      if (selectedPlanId && key === selectedPlanId) {
                                        const firstActive = next.find((p) => p.isActive !== false)
                                        setSelectedPlanId(firstActive?.id ?? next[0]?.id)
                                      }
                                      return next
                                    })
                                    if (editingPlanId === key) {
                                      setEditingPlanId(null)
                                      setNewPlanName('')
                                      setNewPlanPrice('0')
                                    }
                                  }
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Only show selected-plan summary for non–tenant-managers (they manage plans, not choose one). */}
              {!isTenantManager && plans.length > 0 && selectedPlanId && (
                <div className="mx-auto max-w-md rounded-xl border bg-card/60 px-4 py-3 text-xs text-muted-foreground sm:text-sm">
                  <span className="font-medium text-foreground">Selected plan:</span>{' '}
                  <span>
                    {plans.find((p) => p.id === selectedPlanId)?.name ?? 'None'}
                  </span>
                </div>
              )}

              {plans.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  No plans are currently published for this tenant.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {plans.map((plan) => {
                    const isSelected = !isTenantManager && selectedPlanId === plan.id
                    return (
                      <div
                        key={plan.id ?? plan.name}
                        className={`relative flex h-full flex-col rounded-2xl border p-5 shadow-sm ${
                          isSelected ? 'border-primary/50 bg-primary/5' : 'bg-card/60'
                        } ${plan.isActive === false ? 'opacity-70' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold">{plan.name}</h3>
                            {plan.description ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {plan.description}
                              </p>
                            ) : null}
                          </div>
                          {plan.isActive === false ? (
                            <span className="rounded-full border border-dashed px-2 py-0.5 text-[0.65rem] text-muted-foreground">
                              Hidden
                            </span>
                          ) : isSelected ? (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.65rem] font-semibold text-primary">
                              Selected
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] text-muted-foreground">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <div className="text-3xl font-semibold">
                            {formatPrice(plan.price, plan.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDuration(plan.durationDays)}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                          <div className="rounded-lg bg-muted/60 px-3 py-2">
                            {formatLimit(plan.maxAppointments, 'appointments')}
                          </div>
                          <div className="rounded-lg bg-muted/60 px-3 py-2">
                            {formatLimit(plan.maxConsultations, 'consultations')}
                          </div>
                        </div>

                        <div className="mt-5 text-xs text-muted-foreground">
                          Plan availability is managed by the tenant manager. Users can choose from the
                          currently offered plans.
                        </div>

                        {/* Only show "Choose this plan" for non–tenant-managers. */}
                        {!isTenantManager && (
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                              onClick={() => setSelectedPlanId(plan.id ?? plan.name)}
                              disabled={plan.isActive === false}
                            >
                              {plan.isActive === false
                                ? 'Unavailable'
                                : selectedPlanId === (plan.id ?? plan.name)
                                  ? 'Selected'
                                  : 'Choose this plan'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
