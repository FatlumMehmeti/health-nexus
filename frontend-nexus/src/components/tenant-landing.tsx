/**
 * Public tenant landing with simple tabs:
 * HOME (hero/about) + DEPARTMENTS from API,
 * PRODUCTS / PLANS are placeholders for now.
 *
 * Used by /landing/$tenantSlug. Data from GET /api/tenants/by-slug/{slug}/landing.
 */
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { can } from '@/lib/rbac'
import { useAuthStore } from '@/stores/auth.store'
import { resolveMediaUrl } from '@/lib/media-url'
import type { TenantLandingPageResponse } from '@/interfaces'

export interface TenantLandingProps {
  /** Landing data from API; null while loading */
  landingData: TenantLandingPageResponse | null
}

interface BrandStyles {
  headerStyle?: CSSProperties
  bodyStyle?: CSSProperties
  primary?: string | null
  secondary?: string | null
  background?: string | null
  foreground?: string | null
}

function buildBrandStyles(details: TenantLandingPageResponse['details']): BrandStyles {
  return {
    headerStyle:
      details?.font_header_family != null ? { fontFamily: details.font_header_family } : undefined,
    bodyStyle:
      details?.font_body_family != null ? { fontFamily: details.font_body_family } : undefined,
    primary: details?.brand_color_primary ?? null,
    secondary: details?.brand_color_secondary ?? null,
    background: details?.brand_color_background ?? null,
    foreground: details?.brand_color_foreground ?? null,
  }
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

function formatCurrency(value: number): string {
  return usdFormatter.format(Number.isFinite(value) ? value : 0)
}

export function TenantLanding({ landingData }: TenantLandingProps) {
  const [activeTab, setActiveTab] = useState('home')
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const canOpenTenantDashboard = can({ role }, 'DASHBOARD_TENANT')

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login', search: { reason: undefined, redirect: undefined }, replace: true })
  }

  const handleGoToTenantDashboard = () => {
    navigate({
      to: '/dashboard/tenant/$section',
      params: { section: 'departments-services' },
    })
  }

  const userInitial = (user?.email?.trim().charAt(0) || user?.fullName?.trim().charAt(0) || 'U')
    .toUpperCase()

  if (!landingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  const { tenant, details, departments, products } = landingData
  const plans = landingData.plans ?? []
  const title = details?.title ?? tenant.name
  const subtitle = details?.slogan ?? 'Welcome to our landing page.'
  const logo = resolveMediaUrl(details?.logo)
  const heroImage = resolveMediaUrl(details?.image)
  const moto = details?.moto ?? 'Your health, our priority.'
  const about = details?.about_text ?? 'No description available.'
  const slug = tenant.slug ?? ''
  const brand = buildBrandStyles(details)
  const fontHeaderStyle = brand.headerStyle
  const fontBodyStyle = brand.bodyStyle
  const featuredDepartments = departments.slice(0, 3)
  const availableProducts = products.filter((product) => product.is_available !== false)
  const accountButtonStyle: CSSProperties | undefined = brand.primary
    ? {
        backgroundColor: brand.primary,
        borderColor: brand.primary,
        color: brand.foreground ?? '#ffffff',
      }
    : brand.secondary
      ? { borderColor: brand.secondary, color: brand.secondary }
      : undefined

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={fontBodyStyle}
    >
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 bg-linear-to-b from-primary/5 via-background to-background"
          style={brand.background ? { backgroundColor: brand.background } : undefined}
        />
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
          <div className="flex items-center gap-4">
            <TabsList variant="line" className="inline-flex items-center gap-1 rounded-lg p-0.75">
              <TabsTrigger value="home">HOME</TabsTrigger>
              <TabsTrigger value="departments">DEPARTMENTS</TabsTrigger>
              <TabsTrigger value="products">PRODUCTS</TabsTrigger>
              <TabsTrigger value="plans">PLANS</TabsTrigger>
            </TabsList>
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-full text-xs text-white! font-semibold"
                    aria-label="Open account menu"
                    title={user.email}
                    style={accountButtonStyle}
                  >
                    {userInitial}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                  <DropdownMenuLabel className="text-xs sm:text-sm">
                    Signed in as
                    <br />
                    <span className="font-medium">{user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {canOpenTenantDashboard ? (
                    <>
                      <DropdownMenuItem onClick={handleGoToTenantDashboard}>
                        Go to dashboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  <DropdownMenuItem onClick={handleLogout}>
                    <span className="text-destructive">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-1 flex-col gap-6">
          <TabsContent value="home" className="mt-0 flex-1">
            <section className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row">
              <div className="flex-1 space-y-4 lg:space-y-6">
                <p
                  className="text-sm font-medium uppercase tracking-[0.2em] text-primary"
                  style={brand.secondary ? { color: brand.secondary } : undefined}
                >
                  {moto}
                </p>
                <h1
                  className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
                  style={fontHeaderStyle}
                >
                  {title}
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {about}
                </p>

                {featuredDepartments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Key departments
                    </p>
                    <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                      {featuredDepartments.map((d) => (
                        <li key={d.id} className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={
                              brand.primary ? { backgroundColor: brand.primary } : undefined
                            }
                          />
                          <span>{d.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('departments')}
                    style={
                      brand.primary
                        ? { backgroundColor: brand.primary, borderColor: brand.primary }
                        : undefined
                    }
                  >
                    View departments
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    style={
                      brand.secondary
                        ? { borderColor: brand.secondary, color: brand.secondary }
                        : undefined
                    }
                  >
                    Back to top
                  </Button>
                </div>
              </div>
              <aside className="mt-4 flex flex-1 flex-col gap-3 rounded-xl border bg-card/60 p-4 text-sm shadow-sm sm:p-5 lg:mt-0 lg:max-w-sm">
                <div className="relative h-40 overflow-hidden rounded-lg border bg-muted/40">
                  {heroImage ? (
                    <img
                      src={heroImage}
                      alt={title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Hero image not set
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {logo ? (
                    <img src={logo} alt={title} className="h-8 w-8 rounded-md object-contain" />
                  ) : (
                    <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold">
                      {title
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Brand preview</p>
                </div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  At a glance
                </h2>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Tenant:</span>{' '}
                    <code className="rounded bg-muted px-1 text-xs">{slug || tenant.name}</code>
                  </p>
                  {departments.length > 0 && (
                    <p className="text-muted-foreground">
                      {departments.length} department(s) with services listed below.
                    </p>
                  )}
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
                  {departments.length > 0
                    ? 'Departments and services for this tenant.'
                    : 'No departments configured yet.'}
                </p>
              </div>

              {departments.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {departments.map((dept) => (
                    <article
                      key={dept.id}
                      className="flex h-full flex-col rounded-xl border bg-card/60 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold sm:text-base">{dept.name}</h3>
                          {dept.location && (
                            <p className="text-xs text-muted-foreground sm:text-sm">
                              {dept.location}
                            </p>
                          )}
                        </div>
                        {(dept.phone_number || dept.email) && (
                          <div className="space-y-0.5 text-right text-[0.7rem] text-muted-foreground">
                            {dept.phone_number && <p>{dept.phone_number}</p>}
                            {dept.email && <p>{dept.email}</p>}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {dept.services.length > 0 ? (
                          dept.services.map((service) => (
                            <span
                              key={service.id}
                              className="rounded-full border px-2 py-1 text-xs"
                              style={
                                brand.primary
                                  ? { borderColor: brand.primary, color: brand.primary }
                                  : undefined
                              }
                            >
                              {service.name}
                            </span>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No services listed.</p>
                        )}
                      </div>

                      {dept.services.some((s) => s.description) && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          {dept.services
                            .filter((s) => s.description)
                            .slice(0, 2)
                            .map((s) => s.description)
                            .join(' • ')}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-card/60 p-6 text-center text-sm text-muted-foreground">
                  No departments configured yet.
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="products" className="mt-0 flex-1">
            <section className="mx-auto max-w-5xl space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Products</h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  {availableProducts.length > 0
                    ? 'Healthcare products currently available from this tenant.'
                    : 'No products available yet.'}
                </p>
              </div>

              {availableProducts.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {availableProducts.map((product) => (
                    <article
                      key={product.product_id}
                      className="flex h-full flex-col rounded-xl border bg-card/60 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold sm:text-base">{product.name}</h3>
                        <span
                          className="rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={
                            brand.primary
                              ? { borderColor: brand.primary, color: brand.primary }
                              : undefined
                          }
                        >
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {product.description || 'No description provided.'}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-card/60 p-6 text-center text-sm text-muted-foreground">
                  No products configured yet.
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="plans" className="mt-0 flex-1">
            <section className="mx-auto max-w-5xl space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Plans &amp; memberships
                </h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  {plans.length > 0
                    ? 'Explore tenant-specific pricing and coverage limits for care packages.'
                    : 'No plans available yet.'}
                </p>
              </div>

              {selectedPlanId && (() => {
                const selected = plans.find((p) => p.id === selectedPlanId)
                if (!selected) return null
                return (
                  <div
                    className="flex items-center justify-between rounded-xl border-2 p-4"
                    style={{ borderColor: brand.primary ?? undefined, backgroundColor: `${brand.primary ?? '#2563eb'}10` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold"
                        style={{ backgroundColor: brand.primary ?? '#2563eb' }}
                      >
                        ✓
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{selected.name}</p>
                        <p className="text-xs text-muted-foreground">
                          €{Number(selected.price).toFixed(2)}{selected.duration ? ` / ${selected.duration} days` : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPlanId(null)}
                    >
                      Change plan
                    </Button>
                  </div>
                )
              })()}

              {plans.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id
                    return (
                    <article
                      key={plan.id}
                      className={`flex h-full flex-col rounded-xl border p-5 shadow-sm transition-all ${
                        isSelected
                          ? 'ring-2 bg-card/80'
                          : 'bg-card/60'
                      }`}
                      style={isSelected ? { borderColor: brand.primary ?? undefined, outlineColor: brand.primary ?? undefined } : undefined}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold sm:text-base">{plan.name}</h3>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Active
                        </span>
                      </div>

                      <p className="mt-3 text-2xl font-bold tracking-tight">
                        €{Number(plan.price).toFixed(2)}
                      </p>
                      {plan.duration && (
                        <p className="text-xs text-muted-foreground">
                          {plan.duration} day{plan.duration !== 1 ? 's' : ''} duration
                        </p>
                      )}

                      <p className="mt-3 flex-1 text-sm text-muted-foreground">
                        {plan.description || 'No description provided.'}
                      </p>

                      <div className="mt-4 space-y-2 border-t pt-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Appointments</span>
                          <span className="font-medium">
                            {plan.max_appointments != null ? plan.max_appointments : 'Unlimited'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Consultations</span>
                          <span className="font-medium">
                            {plan.max_consultations != null ? plan.max_consultations : 'Unlimited'}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="mt-4 w-full"
                        variant={isSelected ? 'outline' : 'default'}
                        disabled={isSelected}
                        style={
                          isSelected
                            ? { borderColor: brand.primary ?? undefined, color: brand.primary ?? undefined }
                            : brand.primary
                              ? { backgroundColor: brand.primary, borderColor: brand.primary }
                              : undefined
                        }
                        onClick={() => {
                          setSelectedPlanId(plan.id)
                          toast.success(`Subscribed to ${plan.name}!`, {
                            description: 'Your plan has been selected.',
                          })
                        }}
                      >
                        {isSelected ? 'You have selected this plan' : 'Subscribe to this plan'}
                      </Button>
                    </article>
                  )})}
                </div>
              ) : (
                <div className="rounded-xl border bg-card/60 p-6 text-center text-sm text-muted-foreground">
                  No plans configured yet.
                </div>
              )}
            </section>
          </TabsContent>
        </div>
      </main>
    </Tabs>
  )
}
