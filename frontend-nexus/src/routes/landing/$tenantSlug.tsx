/**
 * Public tenant landing route: /landing/$tenantSlug
 * No requireAuth – accessible to everyone.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { TenantLanding } from '@/components/tenant-landing'

/** Mock config keyed by tenant slug – placeholder title/subtitle/logo for PRD-03. */
export const tenantLandingConfig: Record<
  string,
  { title: string; subtitle: string; logo?: string }
> = {
  'spitali-amerikan': {
    title: 'American Hospital',
    subtitle: 'Quality care, close to you.',
    logo: '/images/logo.webp',
  },
  'spital-iliria': {
    title: 'Iliria Hospital',
    subtitle: 'Your health, our priority.',
    logo: '/images/logo.webp',
  },
}

export const Route = createFileRoute(
  '/landing/$tenantSlug'
)({
  component: TenantLandingPage,
})

function TenantLandingPage() {
  const { tenantSlug } = Route.useParams()
  return (
    <TenantLanding
      tenantSlug={tenantSlug}
      config={tenantLandingConfig}
      backToHome={<Link to="/">Back to home</Link>}
    />
  )
}
