/**
 * Public tenant landing placeholder: shows title/subtitle/logo from config or fallback.
 * Used by /landing/$tenantSlug (PRD-03).
 */
import { ReactNode } from 'react'

export type TenantLandingConfig = Record<
  string,
  { title: string; subtitle: string; logo?: string }
>

export interface TenantLandingProps {
  tenantSlug: string
  config: TenantLandingConfig
  backToHome?: ReactNode
}

export function TenantLanding({
  tenantSlug,
  config,
  backToHome,
}: TenantLandingProps) {
  const tenant = config[tenantSlug]
  const title = tenant?.title ?? `Tenant: ${tenantSlug}`
  const subtitle = tenant?.subtitle ?? 'Welcome to our landing page.'
  const logo = tenant?.logo

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="h-9 w-9 rounded-lg object-contain"
              aria-hidden
            />
          ) : (
            <span className="text-lg font-semibold">{title}</span>
          )}
          {backToHome ? (
            <div className="text-sm text-muted-foreground">{backToHome}</div>
          ) : null}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <section className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="text-lg text-muted-foreground">{subtitle}</p>
          <p className="text-sm text-muted-foreground">
            Placeholder landing for slug: <code className="rounded bg-muted px-1">{tenantSlug}</code>
          </p>
        </section>
      </main>
    </div>
  )
}
