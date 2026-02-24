/**
 * Authenticated tenant selector: /tenants
 * Protected with APP_TENANT_SELECTOR (CLIENT, DOCTOR, SALES, TENANT_MANAGER).
 *
 * For now we render a static grid of tenant cards; each card links to the
 * public /landing/$tenantSlug page. Backend‑driven memberships can be wired in later.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { requireAuth } from '@/lib/guards/requireAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type TenantCard = {
  name: string
  slug: string
  tagline: string
  logo?: string
}

const TENANT_CARDS: TenantCard[] = [
  {
    name: 'Spitali Amerikan',
    slug: 'spitali-amerikan',
    tagline: 'American Hospital Kosovo',
    logo: '/images/logo.webp',
  },
  {
    name: 'Iliria Hospital',
    slug: 'spital-iliria',
    tagline: 'Modern diagnostics and care.',
    logo: '/images/logo.webp',
  },
  {
    name: 'Dardania Clinic',
    slug: 'dardania-clinic',
    tagline: 'Neighborhood clinic with heart.',
  },
]

export const Route = createFileRoute('/tenants')({
  beforeLoad: requireAuth({ routeKey: 'APP_TENANT_SELECTOR' }),
  component: TenantSelectorPage,
})

function TenantSelectorPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <h1 className="text-base font-semibold tracking-tight sm:text-lg">Choose a tenant</h1>
          <Badge variant="outline" className="text-xs sm:text-[0.7rem]">
            Tenant selector
          </Badge>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <section className="mx-auto max-w-5xl space-y-6">
          <p className="text-sm text-muted-foreground sm:text-base">
            Select which organization you want to use with Health Nexus. You can switch tenants at any
            time.
          </p>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TENANT_CARDS.map((tenant) => (
              <Link
                key={tenant.slug}
                to="/landing/$tenantSlug"
                params={{ tenantSlug: tenant.slug }}
                className="focus-visible:outline-none"
              >
                <Card className="h-full cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md">
                  <CardHeader className="gap-3 pb-3">
                    <div className="flex items-center gap-3">
                      {tenant.logo ? (
                        <img
                          src={tenant.logo}
                          alt={tenant.name}
                          className="h-9 w-9 flex-shrink-0 rounded-lg object-contain"
                        />
                      ) : (
                        <div className="bg-primary/10 text-primary flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                          {tenant.name
                            .split(' ')
                            .map((p) => p[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <CardTitle className="text-sm sm:text-base">{tenant.name}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          {tenant.tagline}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0">
                    <p className="text-xs text-muted-foreground sm:text-[0.8rem]">
                      Continue to branded landing for this tenant.
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
