/**
 * Public tenant landing route: /landing/$tenantSlug
 * No requireAuth – accessible to everyone.
 * Plans are loaded from API (GET /user-tenant-plans/tenant/{tenantId}), not mock data.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { TenantLanding, type TenantLandingConfig } from '../../components/tenant-landing'

/** Config keyed by tenant slug. Plans come from API via tenantId. */
export const tenantLandingConfig: TenantLandingConfig = {
  'spitali-amerikan': {
    title: 'American Hospital',
    subtitle: 'Quality care, close to you.',
    logo: '/images/logo.webp',
    moto: 'Excellence in healthcare',
    about:
      'American Hospital Kosovo provides comprehensive healthcare services with a focus on patient safety, modern technology, and compassionate teams.',
    tenantId: 1,
  },
  'spital-iliria': {
    title: 'Iliria Hospital',
    subtitle: 'Your health, our priority.',
    logo: '/images/logo.webp',
    moto: 'Care that feels personal',
    about:
      'Iliria Hospital combines experienced specialists with friendly staff to deliver a warm, patient‑centric experience for families and individuals.',
    tenantId: 2,
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
