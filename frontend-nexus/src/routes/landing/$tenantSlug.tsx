/**
 * Public tenant landing route: /landing/$tenantSlug
 * No requireAuth – accessible to everyone.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { TenantLanding, type TenantLandingConfig } from '../../components/tenant-landing'

/** Mock config keyed by tenant slug – placeholder content for PRD-03. */
export const tenantLandingConfig: TenantLandingConfig = {
  'spitali-amerikan': {
    title: 'American Hospital',
    subtitle: 'Quality care, close to you.',
    logo: '/images/logo.webp',
    moto: 'Excellence in healthcare',
    about:
      'American Hospital Kosovo provides comprehensive healthcare services with a focus on patient safety, modern technology, and compassionate teams.',
    plans: [
      {
        id: 'basic-care',
        name: 'Basic Care',
        description: 'Routine check-ups and essential diagnostics.',
        price: 25,
        currency: 'EUR',
        durationDays: 30,
        maxAppointments: 2,
        maxConsultations: 1,
        isActive: true,
      },
      {
        id: 'diagnostic-plus',
        name: 'Diagnostic Plus',
        description: 'Includes imaging and extended lab coverage.',
        price: 40,
        currency: 'EUR',
        durationDays: 30,
        maxAppointments: 3,
        maxConsultations: 2,
        isActive: true,
      },
      {
        id: 'family-plus',
        name: 'Family Plus',
        description: 'Expanded care for families with priority scheduling.',
        price: 65,
        currency: 'EUR',
        durationDays: 30,
        maxAppointments: 6,
        maxConsultations: 4,
        isActive: true,
      },
      {
        id: 'senior-care',
        name: 'Senior Care',
        description: 'Chronic care check-ins and specialist access.',
        price: 90,
        currency: 'EUR',
        durationDays: 30,
        maxAppointments: 5,
        maxConsultations: 5,
        isActive: true,
      },
      {
        id: 'concierge',
        name: 'Concierge',
        description: 'Premium access with flexible care coordination.',
        price: 140,
        currency: 'EUR',
        durationDays: 30,
        maxAppointments: null,
        maxConsultations: null,
        isActive: true,
      },
    ],
  },
  'spital-iliria': {
    title: 'Iliria Hospital',
    subtitle: 'Your health, our priority.',
    logo: '/images/logo.webp',
    moto: 'Care that feels personal',
    about:
      'Iliria Hospital combines experienced specialists with friendly staff to deliver a warm, patient‑centric experience for families and individuals.',
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        description: 'Quick access to primary care and basic imaging.',
        price: 18,
        currency: 'EUR',
        durationDays: 30,
        maxAppointments: 1,
        maxConsultations: 1,
        isActive: true,
      },
      {
        id: 'essentials',
        name: 'Essentials',
        description: 'Basic outpatient visits with lab discounts.',
        price: 28,
        currency: 'EUR',
        durationDays: 30,
        maxAppointments: 2,
        maxConsultations: 1,
        isActive: true,
      },
      {
        id: 'standard',
        name: 'Standard',
        description: 'Balanced coverage for outpatient visits.',
        price: 45,
        currency: 'EUR',
        durationDays: 30,
        maxAppointments: 4,
        maxConsultations: 2,
        isActive: true,
      },
      {
        id: 'family',
        name: 'Family',
        description: 'Includes pediatric visits and annual check-ups.',
        price: 60,
        currency: 'EUR',
        durationDays: 30,
        maxAppointments: 5,
        maxConsultations: 3,
        isActive: true,
      },
      {
        id: 'legacy',
        name: 'Legacy',
        description: 'Retired plan kept for existing members.',
        price: 35,
        currency: 'EUR',
        durationDays: 30,
        maxAppointments: 3,
        maxConsultations: 2,
        isActive: false,
      },
    ],
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
