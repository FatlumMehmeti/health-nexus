import { LandingDemoFooter } from '@/components/landing-demo/footer';
import { PublicAuthHeader } from '@/components/molecules/public-auth-header';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { resolveMediaUrl } from '@/lib/media-url';
import {
  AudienceSection,
  FaqSection,
  FeaturesSection,
  JourneySection,
  PricingSection,
  ProofSection,
  ValueSection,
} from '@/routes/landing-demo/components/content-sections';
import { benefits, fallbackTenants } from './components/data';
import { HeroSection } from './components/hero-section';
import { TenantShowcaseSection } from './components/tenant-showcase-section';
import { tenantsService } from '@/services/tenants.service';
import { useAuthStore } from '@/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/landing-demo/')({
  component: LandingDemoPage,
});

function LandingDemoPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: publicTenants = [] } = useQuery({
    queryKey: ['public-tenants'],
    queryFn: () => tenantsService.listPublicTenants(),
    staleTime: 60_000,
  });

  const displayTenants =
    publicTenants.length > 0
      ? publicTenants.map((tenant, index) => ({
          id: tenant.id,
          slug: tenant.slug ?? String(tenant.id),
          name: tenant.name,
          image:
            resolveMediaUrl(tenant.image) ??
            resolveMediaUrl(tenant.logo) ??
            fallbackTenants[index % fallbackTenants.length].image,
          logo: resolveMediaUrl(tenant.logo),
          accent:
            fallbackTenants[index % fallbackTenants.length].accent,
          icon: fallbackTenants[index % fallbackTenants.length].icon,
        }))
      : fallbackTenants.map((tenant, index) => ({
          id: index,
          slug: null,
          name: tenant.name,
          image: tenant.image,
          logo: null,
          accent: tenant.accent,
          icon: tenant.icon,
        }));

  const featuredTenants = displayTenants.slice(0, 4);
  const heroStats = [
    {
      value: String(Math.max(displayTenants.length, 4)),
      label: 'Healthcare organizations onboarded',
      color: 'from-amber-400/20 to-orange-500/10',
    },
    {
      value: '5',
      label: 'Connected patient journeys',
      color: 'from-sky-400/20 to-cyan-500/10',
    },
    {
      value: '1',
      label: 'Platform for growth and operations',
      color: 'from-emerald-400/20 to-teal-500/10',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(42_100%_70%/.16),transparent_30%),radial-gradient(circle_at_top_right,hsl(205_100%_70%/.12),transparent_32%),radial-gradient(circle_at_center,hsl(320_100%_70%/.08),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,hsl(42_100%_55%/.10),transparent_30%),radial-gradient(circle_at_top_right,hsl(205_100%_55%/.10),transparent_32%),radial-gradient(circle_at_center,hsl(320_100%_60%/.06),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(0_0%_50%/.08)_1px,transparent_1px),linear-gradient(to_bottom,hsl(0_0%_50%/.08)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,white,transparent_86%)] dark:bg-[linear-gradient(to_right,hsl(0_0%_100%/.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(0_0%_100%/.05)_1px,transparent_1px)]" />
      </div>

      <PublicAuthHeader
        className="border-border/60 bg-background/75 backdrop-blur-xl"
        containerClassName="h-16 px-6"
        showRightSlotWhenAuthenticated
        rightSlot={
          <div className="flex items-center gap-2">
            <ThemeToggle
              variant="outline"
              size="sm"
              className="rounded-full bg-card/80 px-3"
            />
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="sm" className="rounded-full px-4">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button size="sm" className="rounded-full px-4">
                  Get started
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <main className="container mx-auto flex w-full flex-col gap-20 px-6 py-10 sm:px-8 lg:px-10 lg:py-16">
        <HeroSection stats={heroStats} benefits={benefits} />
        <TenantShowcaseSection tenants={featuredTenants} />
        <JourneySection />
        <AudienceSection />
        <FeaturesSection />
        <ValueSection benefits={benefits} />
        <PricingSection />
        <ProofSection />
        <FaqSection />
      </main>

      <LandingDemoFooter />
    </div>
  );
}
