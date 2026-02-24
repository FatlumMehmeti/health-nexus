/**
 * Public tenant landing with simple tabs:
 * HOME (hero/about) + DEPARTMENTS (table) implemented,
 * PRODUCTS / PLANS are placeholders for now.
 *
 * Used by /landing/$tenantSlug (PRD-03).
 */
import type { ReactNode } from 'react'
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

export type TenantLandingConfig = Record<
  string,
  {
    title: string
    subtitle: string
    logo?: string
    moto?: string
    about?: string
    primaryFontClass?: string
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
  const tenant = config[tenantSlug]
  const title = tenant?.title ?? `Tenant: ${tenantSlug}`
  const subtitle = tenant?.subtitle ?? 'Welcome to our landing page.'
  const logo = tenant?.logo
  const moto = tenant?.moto ?? 'Your health, our priority.'
  const about =
    tenant?.about ??
    'This is a sample description for the tenant landing page. Real content will come from the backend.'
  const fontClass = tenant?.primaryFontClass ?? 'font-sans'

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
            <section className="mx-auto max-w-3xl space-y-3 text-center">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Plans – coming soon
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Future area for pricing plans, memberships, or insurance coverage details for this
                tenant.
              </p>
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
