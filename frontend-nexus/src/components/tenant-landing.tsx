/**
 * Public tenant landing with simple tabs:
 * HOME (hero/about) + DEPARTMENTS from API,
 * PRODUCTS / PLANS are placeholders for now.
 *
 * Used by /landing/$tenantSlug. Data from GET /api/tenants/by-slug/{slug}/landing.
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import type { TenantLandingPageResponse } from '@/interfaces';
import { isApiError } from '@/lib/api-client';
import { resolveMediaUrl } from '@/lib/media-url';
import { can } from '@/lib/rbac';
import { clientsService } from '@/services/clients.service';
import { patientsService } from '@/services/patients.service';
import { tenantPlansService } from '@/services/tenant-plans.service';
import { usersService } from '@/services/users.service';
import { useAuthStore } from '@/stores/auth.store';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PaymentFlowNotice } from './PaymentFlowNotice';
import { StripePaymentModal } from './StripePaymentModal';
import { checkoutService } from '@/services/checkout.service';
import {
  clearCheckoutRecovery,
  loadCheckoutRecovery,
  saveCheckoutRecovery,
  type CheckoutRecoveryRecord,
} from '@/services/checkout-recovery.service';
import { toast } from 'sonner';

export interface TenantLandingProps {
  /** Landing data from API; null while loading */
  landingData: TenantLandingPageResponse | null;
}

interface BrandStyles {
  headerStyle?: CSSProperties;
  bodyStyle?: CSSProperties;
  primary?: string | null;
  secondary?: string | null;
  background?: string | null;
  foreground?: string | null;
}

function buildBrandStyles(
  details: TenantLandingPageResponse['details']
): BrandStyles {
  return {
    headerStyle:
      details?.font_header_family != null
        ? {
            fontFamily: details.font_header_family,
          }
        : undefined,
    bodyStyle:
      details?.font_body_family != null
        ? { fontFamily: details.font_body_family }
        : undefined,
    primary: details?.brand_color_primary ?? null,
    secondary: details?.brand_color_secondary ?? null,
    background: details?.brand_color_background ?? null,
    foreground: details?.brand_color_foreground ?? null,
  };
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const PAYMENT_CONFIRMATION_TIMEOUT_MS = 45_000;

function formatCurrency(value: number): string {
  return usdFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatStatusTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unavailable';
  return new Date(parsed).toLocaleString();
}

function getApiDetailCode(err: unknown): string | undefined {
  if (!isApiError(err) || !err.data || typeof err.data !== 'object')
    return undefined;
  const detail =
    'detail' in err.data
      ? (err.data as { detail?: unknown }).detail
      : undefined;
  if (!detail || typeof detail !== 'object') return undefined;
  const code =
    'code' in detail
      ? (detail as { code?: unknown }).code
      : undefined;
  return typeof code === 'string' ? code : undefined;
}

export function TenantLanding({ landingData }: TenantLandingProps) {
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showCheckoutStatusModal, setShowCheckoutStatusModal] =
    useState(false);
  const [isCheckingCheckoutStatus, setIsCheckingCheckoutStatus] =
    useState(false);
  const [isCheckoutNoticeVisible, setIsCheckoutNoticeVisible] =
    useState(true);
  const [checkoutRecovery, setCheckoutRecovery] =
    useState<CheckoutRecoveryRecord | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(
    null
  );
  const [registeredOverride, setRegisteredOverride] = useState(false);
  const handledPaymentIdsRef = useRef<Set<number>>(new Set());

  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const tenantId = landingData?.tenant?.id;
  const stripeClientSecret = checkoutRecovery?.clientSecret ?? null;
  const pendingPlanId = checkoutRecovery?.planId ?? null;

  const queryClient = useQueryClient();

  function setEnrollmentCheckoutRecovery(
    next: CheckoutRecoveryRecord | null
  ) {
    if (!next) {
      clearCheckoutRecovery('enrollment');
      setCheckoutRecovery(null);
      return;
    }

    const saved = saveCheckoutRecovery(next);
    setCheckoutRecovery(saved);
  }

  function clearEnrollmentCheckout() {
    setShowStripeModal(false);
    setShowCheckoutStatusModal(false);
    setIsCheckoutNoticeVisible(true);
    setEnrollmentCheckoutRecovery(null);
  }

  function moveEnrollmentCheckoutToAttention() {
    if (!checkoutRecovery) return;
    setEnrollmentCheckoutRecovery({
      ...checkoutRecovery,
      clientSecret: null,
      phase: 'attention_required',
    });
  }

  // Hydrate the selected plan from the user's existing enrollment.
  // Only sync on initial fetch — not on every render — so the user
  // can click "Change plan" without it snapping back immediately.
  const enrollmentRefetchInterval =
    checkoutRecovery?.phase === 'processing'
      ? 2500
      : checkoutRecovery?.phase === 'attention_required'
        ? 5000
        : false;

  const { data: enrollmentData, refetch: refetchEnrollment } =
    useQuery({
      queryKey: ['my-enrollment', tenantId],
      queryFn: () => tenantPlansService.myEnrollment(tenantId!),
      enabled: !!tenantId && isAuthenticated,
      retry: false,
      refetchInterval: enrollmentRefetchInterval,
      refetchIntervalInBackground: true,
    });

  useEffect(() => {
    if (!tenantId || !isAuthenticated) {
      setCheckoutRecovery(null);
      return;
    }

    const savedRecovery = loadCheckoutRecovery('enrollment');
    if (!savedRecovery) {
      setCheckoutRecovery(null);
      return;
    }

    if (savedRecovery.tenantId !== tenantId) {
      clearCheckoutRecovery('enrollment');
      setCheckoutRecovery(null);
      return;
    }

    setCheckoutRecovery(savedRecovery);
    setIsCheckoutNoticeVisible(true);
    setActiveTab('plans');
  }, [tenantId, isAuthenticated]);

  useEffect(() => {
    if (
      enrollmentData?.user_tenant_plan_id &&
      enrollmentData.status === 'ACTIVE'
    ) {
      setSelectedPlanId(enrollmentData.user_tenant_plan_id);
    }
  }, [enrollmentData]);

  useEffect(() => {
    if (!checkoutRecovery || !enrollmentData) return;

    const isRecoveredActivation =
      enrollmentData.status === 'ACTIVE' &&
      enrollmentData.user_tenant_plan_id === checkoutRecovery.planId;

    if (!isRecoveredActivation) return;

    setSelectedPlanId(checkoutRecovery.planId);
    setShowStripeModal(false);
    clearCheckoutRecovery('enrollment');
    setCheckoutRecovery(null);

    if (
      !handledPaymentIdsRef.current.has(checkoutRecovery.paymentId)
    ) {
      handledPaymentIdsRef.current.add(checkoutRecovery.paymentId);
      toast.success('Payment confirmed. Your plan is now active.');
    }
  }, [checkoutRecovery, enrollmentData]);

  useEffect(() => {
    if (checkoutRecovery?.phase !== 'processing') return;

    const startedAt = Date.parse(checkoutRecovery.startedAt);
    if (Number.isNaN(startedAt)) {
      moveEnrollmentCheckoutToAttention();
      return;
    }

    const remainingMs =
      PAYMENT_CONFIRMATION_TIMEOUT_MS - (Date.now() - startedAt);
    if (remainingMs <= 0) {
      moveEnrollmentCheckoutToAttention();
      return;
    }

    const timer = window.setTimeout(() => {
      moveEnrollmentCheckoutToAttention();
    }, remainingMs);

    return () => window.clearTimeout(timer);
  }, [checkoutRecovery]);

  useEffect(() => {
    if (!checkoutRecovery) {
      setIsCheckoutNoticeVisible(true);
      return;
    }

    setIsCheckoutNoticeVisible(true);
  }, [checkoutRecovery?.paymentId, checkoutRecovery?.phase]);

  async function handleCheckEnrollmentStatus() {
    setShowCheckoutStatusModal(true);
    if (!tenantId) return;

    setIsCheckingCheckoutStatus(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: ['my-enrollment', tenantId],
      });
      await refetchEnrollment();
    } finally {
      setIsCheckingCheckoutStatus(false);
    }
  }

  async function handleEnrollmentPaymentFailure(
    errorMessage: string
  ) {
    if (!tenantId) {
      clearEnrollmentCheckout();
      toast.error(errorMessage);
      return;
    }

    try {
      await tenantPlansService.cancelEnrollment(tenantId);
      await queryClient.invalidateQueries({
        queryKey: ['my-enrollment', tenantId],
      });
      setSelectedPlanId(null);
      clearEnrollmentCheckout();
      toast.error('Payment failed. The pending enrollment was cancelled.', {
        description: errorMessage,
      });
    } catch (err) {
      clearEnrollmentCheckout();
      toast.error('Payment failed and the enrollment rollback did not complete.', {
        description: isApiError(err)
          ? err.displayMessage
          : errorMessage,
      });
    }
  }

  async function handleEnrollmentCheckoutCancelled() {
    if (!tenantId) {
      clearEnrollmentCheckout();
      return;
    }

    try {
      await tenantPlansService.cancelEnrollment(tenantId);
      await queryClient.invalidateQueries({
        queryKey: ['my-enrollment', tenantId],
      });
      setSelectedPlanId(null);
      clearEnrollmentCheckout();
      toast.message('Checkout cancelled.');
    } catch (err) {
      clearEnrollmentCheckout();
      toast.error('Checkout was closed, but the pending enrollment was not cancelled.', {
        description: isApiError(err)
          ? err.displayMessage
          : 'Please refresh and try again.',
      });
    }
  }

  const enrollMutation = useMutation({
    mutationFn: async ({
      tenantId,
      planId,
      price,
    }: {
      tenantId: number;
      planId: number;
      price: number;
    }) => {
      // 1. Enroll
      const enrollment = await tenantPlansService.enroll(
        tenantId,
        planId
      );
      if (price <= 0) {
        return { enrollment, planId, requiresPayment: false };
      }
      // 2. Initiate Stripe checkout
      const idempotencyKey = crypto.randomUUID();
      const checkout = await checkoutService.initiate(
        { enrollment_id: enrollment.id },
        idempotencyKey
      );
      setEnrollmentCheckoutRecovery({
        kind: 'enrollment',
        tenantId,
        planId,
        paymentId: checkout.payment_id,
        referenceId: enrollment.id,
        phase: 'collecting_payment',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clientSecret: checkout.stripe_client_secret,
      });
      setShowStripeModal(true);
      return { enrollment, planId, requiresPayment: true };
    },
    onSuccess: async (data) => {
      if (data.requiresPayment) {
        return;
      }

      clearEnrollmentCheckout();
      setSelectedPlanId(data.planId);
      await queryClient.invalidateQueries({
        queryKey: ['my-enrollment', tenantId],
      });
      toast.success('Free plan activated successfully.');
    },
    onError: (err) => {
      clearEnrollmentCheckout();
      toast.error(
        isApiError(err)
          ? err.message
          : 'Failed to subscribe. Please try again.'
      );
    },
  });

  const authEmail = user?.email?.trim() ?? '';
  const meQuery = useQuery({
    queryKey: ['users-me-register-email'],
    queryFn: usersService.getMe,
    enabled: isAuthenticated && !authEmail,
    retry: false,
    staleTime: 5 * 60_000,
  });
  const registerEmail =
    authEmail || meQuery.data?.email?.trim() || '';
  const registrationStatusQuery = useQuery({
    queryKey: ['tenant-patient-registration', tenantId, user?.id],
    queryFn: () => patientsService.getMyTenantProfile(tenantId!),
    enabled: !!tenantId && isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    setRegisteredOverride(false);
  }, [tenantId, isAuthenticated, user?.id]);

  const registrationStatusError = registrationStatusQuery.error;
  const isRegistrationStatusExpectedNotRegistered =
    isApiError(registrationStatusError) &&
    (registrationStatusError.status === 403 ||
      registrationStatusError.status === 404);
  const hasUnexpectedRegistrationStatusError =
    registrationStatusQuery.isError &&
    !isRegistrationStatusExpectedNotRegistered;
  const isRegistered =
    registeredOverride || registrationStatusQuery.isSuccess;
  const isRegistrationCheckPending =
    isAuthenticated &&
    !!tenantId &&
    registrationStatusQuery.isLoading &&
    !registeredOverride;

  const registerMutation = useMutation({
    mutationFn: ({
      tenantId,
      email,
    }: {
      tenantId: number;
      email: string;
    }) =>
      clientsService.registerAsPatient(tenantId, {
        email,
      }),
    onSuccess: () => {
      toast.success('Registered');
      setRegisteredOverride(true);
    },
    onError: (err) => {
      if (
        isApiError(err) &&
        err.status === 409 &&
        getApiDetailCode(err) === 'EMAIL_ALREADY_REGISTERED'
      ) {
        toast.success('Already registered');
        setRegisteredOverride(true);
        return;
      }
      if (isApiError(err) && err.status === 403) {
        toast.error('Access denied');
        return;
      }
      if (isApiError(err) && err.status === 404) {
        toast.error('Tenant not found');
        return;
      }
      toast.error('Registration failed', {
        description: isApiError(err)
          ? err.displayMessage
          : 'Please try again.',
      });
    },
  });

  const handleRegisterAsPatient = () => {
    if (!tenantId) return;
    if (!registerEmail) {
      toast.error(
        'Unable to determine your email. Please try again.'
      );
      return;
    }
    registerMutation.mutate({
      tenantId,
      email: registerEmail,
    });
  };

  // Cancel enrollment so tenant manager sees "no active plan"
  const cancelMutation = useMutation({
    mutationFn: (tid: number) =>
      tenantPlansService.cancelEnrollment(tid),
    onSuccess: () => {
      setSelectedPlanId(null);
      queryClient.invalidateQueries({
        queryKey: ['my-enrollment', tenantId],
      });
      toast.success('Plan cancelled', {
        description: 'You can pick a new plan below.',
      });
    },
    onError: (err) => {
      toast.error(
        isApiError(err)
          ? err.message
          : 'Failed to cancel. Please try again.'
      );
    },
  });
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const canOpenTenantDashboard = can({ role }, 'DASHBOARD_TENANT');

  const handleLogout = async () => {
    await logout();
    navigate({
      to: '/login',
      search: {
        reason: undefined,
        redirect: undefined,
      },
      replace: true,
    });
  };

  const handleGoToTenantDashboard = () => {
    navigate({
      to: '/dashboard/tenant/$section',
      params: { section: 'departments-services' },
    });
  };

  const userInitial = (
    user?.email?.trim().charAt(0) ||
    user?.fullName?.trim().charAt(0) ||
    'U'
  ).toUpperCase();

  if (!landingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  const { tenant, details, departments, products } = landingData;
  const plans = (landingData.plans ?? []).filter(
    (p) => p.is_active !== false
  );
  const title = details?.title ?? tenant.name;
  const subtitle = details?.slogan ?? 'Welcome to our landing page.';
  const logo = resolveMediaUrl(details?.logo);
  const heroImage = resolveMediaUrl(details?.image);
  const moto = details?.moto ?? 'Your health, our priority.';
  const about = details?.about_text ?? 'No description available.';
  const slug = tenant.slug ?? '';
  const brand = buildBrandStyles(details);
  const fontHeaderStyle = brand.headerStyle;
  const fontBodyStyle = brand.bodyStyle;
  const featuredDepartments = departments.slice(0, 3);
  const availableProducts = products.filter(
    (product) => product.is_available !== false
  );
  const pendingPlan = checkoutRecovery
    ? plans.find((plan) => plan.id === checkoutRecovery.planId)
    : null;
  const checkoutStatusTitle =
    checkoutRecovery?.phase === 'processing'
      ? 'Payment confirmation in progress'
      : checkoutRecovery?.phase === 'attention_required'
        ? 'Payment needs attention'
        : 'Checkout status';
  const checkoutStatusDescription =
    checkoutRecovery?.phase === 'processing'
      ? 'We are still waiting for the backend to confirm activation for this payment.'
      : checkoutRecovery?.phase === 'attention_required'
        ? 'This payment is still pending after the expected confirmation window. You can refresh the status or clear it and retry.'
        : 'Review the current state of this pending payment.';
  const accountButtonStyle: CSSProperties | undefined = brand.primary
    ? {
        backgroundColor: brand.primary,
        borderColor: brand.primary,
        color: brand.foreground ?? '#ffffff',
      }
    : brand.secondary
      ? {
          borderColor: brand.secondary,
          color: brand.secondary,
        }
      : undefined;

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={fontBodyStyle}
    >
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className={`
            absolute inset-0 
            bg-gradient-to-br
            from-[#e6edf7] via-[#dbeafe] to-[#b1c4e6]
            dark:from-[#1d2333] dark:via-[#1c2130] dark:to-[#375483]
            brightness-100 dark:brightness-50
            -rotate-6 
            scale-200
            z-[-1]
          `}
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
              <span className="text-sm font-semibold sm:text-base">
                {title}
              </span>
              <span className="text-xs text-muted-foreground sm:text-[0.8rem]">
                {subtitle}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <TabsList
              variant="line"
              className="inline-flex items-center gap-1 rounded-lg p-0.75"
            >
              <TabsTrigger value="home">HOME</TabsTrigger>
              <TabsTrigger value="departments">
                DEPARTMENTS
              </TabsTrigger>
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
                      <DropdownMenuItem
                        onClick={handleGoToTenantDashboard}
                      >
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
                  style={
                    brand.secondary
                      ? { color: brand.secondary }
                      : undefined
                  }
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
                        <li
                          key={d.id}
                          className="flex items-center gap-2"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={
                              brand.primary
                                ? {
                                    backgroundColor: brand.primary,
                                  }
                                : undefined
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
                        ? {
                            backgroundColor: brand.primary,
                            borderColor: brand.primary,
                          }
                        : undefined
                    }
                  >
                    View departments
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.scrollTo({
                        top: 0,
                        behavior: 'smooth',
                      })
                    }
                    style={
                      brand.secondary
                        ? {
                            borderColor: brand.secondary,
                            color: brand.secondary,
                          }
                        : undefined
                    }
                  >
                    Back to top
                  </Button>

                  {/* Register as patient CTA */}
                  {isAuthenticated && user ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          isRegistered ||
                          registerMutation.isPending ||
                          meQuery.isLoading ||
                          isRegistrationCheckPending
                        }
                        loading={registerMutation.isPending}
                        onClick={handleRegisterAsPatient}
                      >
                        {isRegistered
                          ? 'Registered'
                          : isRegistrationCheckPending
                            ? 'Checking...'
                            : 'Register as patient'}
                      </Button>
                      {isRegistered ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            You&apos;re registered. Add details in
                            your Profile.
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              navigate({
                                to: '/dashboard/profile',
                              })
                            }
                          >
                            Go to Profile
                          </Button>
                        </>
                      ) : null}
                      {hasUnexpectedRegistrationStatusError ? (
                        <p className="text-xs text-destructive">
                          Unable to verify registration status right
                          now.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate({
                          to: '/login',
                          search: {
                            reason: undefined,
                            redirect: `/landing/${slug || tenant.id}`,
                          },
                        })
                      }
                    >
                      Sign in to register
                    </Button>
                  )}
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
                    <img
                      src={logo}
                      alt={title}
                      className="h-8 w-8 rounded-md object-contain"
                    />
                  ) : (
                    <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold">
                      {title
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Brand preview
                  </p>
                </div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  At a glance
                </h2>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">
                      Tenant:
                    </span>{' '}
                    <code className="rounded bg-muted px-1 text-xs">
                      {slug || tenant.name}
                    </code>
                  </p>
                  {departments.length > 0 && (
                    <p className="text-muted-foreground">
                      {departments.length} department(s) with services
                      listed below.
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
                          <h3 className="text-sm font-semibold sm:text-base">
                            {dept.name}
                          </h3>
                          {dept.location && (
                            <p className="text-xs text-muted-foreground sm:text-sm">
                              {dept.location}
                            </p>
                          )}
                        </div>
                        {(dept.phone_number || dept.email) && (
                          <div className="space-y-0.5 text-right text-[0.7rem] text-muted-foreground">
                            {dept.phone_number && (
                              <p>{dept.phone_number}</p>
                            )}
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
                                  ? {
                                      borderColor: brand.primary,
                                      color: brand.primary,
                                    }
                                  : undefined
                              }
                            >
                              {service.name}
                            </span>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No services listed.
                          </p>
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
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Products
                </h2>
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
                        <h3 className="text-sm font-semibold sm:text-base">
                          {product.name}
                        </h3>
                        <span
                          className="rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={
                            brand.primary
                              ? {
                                  borderColor: brand.primary,
                                  color: brand.primary,
                                }
                              : undefined
                          }
                        >
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {product.description ||
                          'No description provided.'}
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

              {checkoutRecovery && isCheckoutNoticeVisible ? (
                <PaymentFlowNotice
                  phase={checkoutRecovery.phase}
                  eyebrow="Plan checkout"
                  title={
                    checkoutRecovery.phase === 'collecting_payment'
                      ? 'Your secure checkout is ready'
                      : checkoutRecovery.phase === 'processing'
                        ? 'We are confirming your payment'
                        : 'Payment submitted, but activation is still pending'
                  }
                  description={
                    checkoutRecovery.phase === 'collecting_payment'
                      ? 'Return to the Stripe form to finish your payment. Your current selection will stay pending until you submit the card details.'
                      : checkoutRecovery.phase === 'processing'
                        ? 'Stripe accepted your submission. This page will keep checking for plan activation and update automatically once the backend confirms it.'
                        : 'We have not confirmed activation yet. You can check again now, or clear this pending checkout and start over if you need to retry.'
                  }
                  primaryAction={{
                    label:
                      checkoutRecovery.phase === 'collecting_payment'
                        ? 'Resume checkout'
                        : 'Check status now',
                    onClick: async () => {
                      if (
                        checkoutRecovery.phase ===
                        'collecting_payment'
                      ) {
                        setShowStripeModal(true);
                        setActiveTab('plans');
                        return;
                      }

                      await handleCheckEnrollmentStatus();
                    },
                  }}
                  secondaryAction={{
                    label:
                      checkoutRecovery.phase === 'attention_required'
                        ? 'Clear pending checkout'
                        : 'Close notice',
                    onClick: () => {
                      if (
                        checkoutRecovery.phase ===
                        'attention_required'
                      ) {
                        clearEnrollmentCheckout();
                        return;
                      }
                      setShowStripeModal(false);
                      setIsCheckoutNoticeVisible(false);
                    },
                    variant: 'outline',
                  }}
                />
              ) : null}

              {checkoutRecovery && !isCheckoutNoticeVisible ? (
                <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      Plan checkout is still pending
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reopen the notice, resume checkout, or review the
                      current status.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      onClick={() => setIsCheckoutNoticeVisible(true)}
                    >
                      Open notice
                    </Button>
                    <Button
                      onClick={async () => {
                        if (
                          checkoutRecovery.phase ===
                          'collecting_payment'
                        ) {
                          setShowStripeModal(true);
                          setActiveTab('plans');
                          return;
                        }

                        await handleCheckEnrollmentStatus();
                      }}
                    >
                      {checkoutRecovery.phase === 'collecting_payment'
                        ? 'Open checkout'
                        : 'Check status'}
                    </Button>
                  </div>
                </div>
              ) : null}

              <Dialog
                open={showCheckoutStatusModal && !!checkoutRecovery}
                onOpenChange={setShowCheckoutStatusModal}
              >
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{checkoutStatusTitle}</DialogTitle>
                    <DialogDescription>
                      {checkoutStatusDescription}
                    </DialogDescription>
                  </DialogHeader>

                  {checkoutRecovery ? (
                    <div className="space-y-3">
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-muted-foreground">
                              Plan
                            </p>
                            <p className="font-medium">
                              {pendingPlan?.name ?? 'Pending plan'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Payment ID
                            </p>
                            <p className="font-medium">
                              #{checkoutRecovery.paymentId}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Enrollment ID
                            </p>
                            <p className="font-medium">
                              #{checkoutRecovery.referenceId}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Current phase
                            </p>
                            <p className="font-medium capitalize">
                              {checkoutRecovery.phase.replaceAll(
                                '_',
                                ' '
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Started
                            </p>
                            <p className="font-medium">
                              {formatStatusTimestamp(
                                checkoutRecovery.startedAt
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Last updated
                            </p>
                            <p className="font-medium">
                              {formatStatusTimestamp(
                                checkoutRecovery.updatedAt
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
                        {checkoutRecovery.phase === 'processing'
                          ? 'Stripe accepted your payment submission. Activation will finish once the backend confirms the enrollment update.'
                          : 'The payment has not been confirmed yet. If this status does not change after another refresh, clear the pending checkout and try again.'}
                      </div>
                    </div>
                  ) : null}

                  <DialogFooter>
                    {checkoutRecovery?.phase ===
                    'attention_required' ? (
                      <Button
                        variant="outline"
                        onClick={clearEnrollmentCheckout}
                      >
                        Clear pending checkout
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      onClick={() => setShowCheckoutStatusModal(false)}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={handleCheckEnrollmentStatus}
                      loading={isCheckingCheckoutStatus}
                    >
                      Refresh status
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {selectedPlanId &&
                (() => {
                  const selected = plans.find(
                    (p) => p.id === selectedPlanId
                  );
                  if (!selected) return null;
                  return (
                    <div
                      className="flex items-center justify-between rounded-xl border-2 p-4"
                      style={{
                        borderColor: brand.primary ?? undefined,
                        backgroundColor: `${brand.primary ?? '#2563eb'}10`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold"
                          style={{
                            backgroundColor:
                              brand.primary ?? '#2563eb',
                          }}
                        >
                          ✓
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {selected.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            €{Number(selected.price).toFixed(2)}
                            {selected.duration
                              ? ` / ${selected.duration} days`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={cancelMutation.isPending}
                        onClick={() => {
                          if (tenantId)
                            cancelMutation.mutate(tenantId);
                        }}
                      >
                        {cancelMutation.isPending
                          ? 'Cancelling…'
                          : 'Change plan'}
                      </Button>
                    </div>
                  );
                })()}

              {plans.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const isCheckoutPending =
                      enrollMutation.isPending &&
                      pendingPlanId === plan.id;
                    const isRecoveryLocked =
                      !!checkoutRecovery &&
                      checkoutRecovery.phase !== 'attention_required';
                    const isFreePlan = Number(plan.price) <= 0;
                    return (
                      <article
                        key={plan.id}
                        className={`flex h-full flex-col rounded-xl border p-5 shadow-sm transition-all ${
                          isSelected
                            ? 'ring-2 bg-card/80'
                            : 'bg-card/60'
                        }`}
                        style={
                          isSelected
                            ? {
                                borderColor:
                                  brand.primary ?? undefined,
                                outlineColor:
                                  brand.primary ?? undefined,
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm font-semibold sm:text-base">
                            {plan.name}
                          </h3>
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {isSelected ? 'Active' : 'Available'}
                          </span>
                        </div>

                        <p className="mt-3 text-2xl font-bold tracking-tight">
                          €{Number(plan.price).toFixed(2)}
                        </p>
                        {plan.duration && (
                          <p className="text-xs text-muted-foreground">
                            {plan.duration} day
                            {plan.duration !== 1 ? 's' : ''} duration
                          </p>
                        )}

                        <p className="mt-3 flex-1 text-sm text-muted-foreground">
                          {plan.description ||
                            'No description provided.'}
                        </p>

                        <div className="mt-4 space-y-2 border-t pt-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Appointments
                            </span>
                            <span className="font-medium">
                              {plan.max_appointments != null
                                ? plan.max_appointments
                                : 'Unlimited'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Consultations
                            </span>
                            <span className="font-medium">
                              {plan.max_consultations != null
                                ? plan.max_consultations
                                : 'Unlimited'}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="mt-4 w-full"
                          variant={isSelected ? 'outline' : 'default'}
                          disabled={
                            isSelected ||
                            enrollMutation.isPending ||
                            isRecoveryLocked
                          }
                          style={
                            isSelected
                              ? {
                                  borderColor:
                                    brand.primary ?? undefined,
                                  color: brand.primary ?? undefined,
                                }
                              : brand.primary
                                ? {
                                    backgroundColor: brand.primary,
                                    borderColor: brand.primary,
                                  }
                                : undefined
                          }
                          onClick={async () => {
                            if (!isAuthenticated) {
                              toast.error(
                                'Please log in to subscribe to a plan.'
                              );
                              return;
                            }
                            enrollMutation.mutate({
                              tenantId: tenant.id,
                              planId: plan.id,
                              price: Number(plan.price),
                            });
                          }}
                        >
                          {isSelected
                            ? 'You have selected this plan'
                            : isCheckoutPending
                              ? isFreePlan
                                ? 'Activating free plan…'
                                : 'Redirecting to payment…'
                              : isFreePlan
                                ? 'Choose this free plan'
                                : 'Subscribe to this plan'}
                        </Button>
                        {/* Stripe Payment Modal */}
                        <StripePaymentModal
                          clientSecret={stripeClientSecret ?? ''}
                          open={
                            showStripeModal && !!stripeClientSecret
                          }
                          onClose={async () => {
                            if (
                              checkoutRecovery?.phase ===
                              'collecting_payment'
                            ) {
                              await handleEnrollmentCheckoutCancelled();
                              return;
                            }
                            setShowStripeModal(false);
                          }}
                          onPaymentConfirmed={async () => {
                            if (!checkoutRecovery) return;

                            setShowStripeModal(false);
                            setEnrollmentCheckoutRecovery({
                              ...checkoutRecovery,
                              clientSecret: null,
                              phase: 'processing',
                            });
                            await queryClient.invalidateQueries({
                              queryKey: ['my-enrollment', tenantId],
                            });
                          }}
                          onPaymentFailed={async (errorMessage) => {
                            await handleEnrollmentPaymentFailure(
                              errorMessage
                            );
                          }}
                        />
                      </article>
                    );
                  })}
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
  );
}
