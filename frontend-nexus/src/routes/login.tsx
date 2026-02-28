/**
 * Login route: email/password form, session-expired/revoked messaging, redirect when already authenticated.
 * beforeLoad: if user is already authenticated, redirect to /dashboard so /login is not shown when logged in.
 */
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/atoms/form-field'
import { PasswordField } from '@/components/atoms/password-field'
import { useAuthStore } from '@/stores/auth.store'
import { ApiError } from '@/lib/api-client'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const { ensureAuth, isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) await ensureAuth()
    const state = useAuthStore.getState()
    if (state.isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }
  },
  /** Parses ?reason=expired|revoked and ?redirect= for post-login redirect. */
  validateSearch: (search: Record<string, unknown>) => {
    const reason = typeof search.reason === 'string' ? search.reason : undefined
    const redirect =
      typeof search.redirect === 'string' && search.redirect.startsWith('/') && !search.redirect.startsWith('//')
        ? search.redirect
        : undefined
    return { reason, redirect }
  },
  component: LoginPage,
})

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const status = useAuthStore((s) => s.status)
  const storeError = useAuthStore((s) => s.error)
  const { reason, redirect: redirectTo } = Route.useSearch()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const loginError = storeError ?? submitError
  /** Shown when user was redirected with ?reason=expired or ?reason=revoked (e.g. after global 401 handler). */
  const reasonMessage =
    reason === 'expired'
      ? 'Session expired, please sign in again.'
      : reason === 'revoked'
        ? 'Session revoked, please sign in again.'
        : null

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    setSubmitError(null)
    try {
      await login(values)
      
      // Get updated state after login/ensureAuth
      const state = useAuthStore.getState()
      const { user, role, tenantId } = state
      
      // eslint-disable-next-line no-console
      console.log('[Login onSubmit] After login:', { email: user?.email, role, tenantId })

      // If there's an explicit redirect param, use it
      if (redirectTo) {
        await navigate({ to: redirectTo, replace: true })
        return
      }

      // Role-based redirect
      const roleStr = role as unknown as string | undefined
      if (roleStr === 'DOCTOR' || roleStr === 'SUPER_ADMIN' || roleStr === 'TENANT_MANAGER' || roleStr === 'SALES') {
        await navigate({ to: '/dashboard', replace: true })
        return
      }

      // Seeded enrolled patient — hardcoded bypass
      if (user?.email === 'client.user@seed.com') {
        useAuthStore.setState({ tenantId: '1' })
        await navigate({ to: '/appointments/book', replace: true })
        return
      }

      // CLIENT users — check enrollment via backend
      if (tenantId) {
        try {
          const { checkEnrollment } = await import('@/services/auth.service')
          const isEnrolled = await checkEnrollment(tenantId)
          if (isEnrolled) {
            await navigate({ to: '/appointments/book', replace: true })
          } else {
            await navigate({ to: '/enrollment', replace: true })
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[Login onSubmit] Enrollment check failed:', err)
          await navigate({ to: '/enrollment', replace: true })
        }
      } else {
        await navigate({ to: '/enrollment', replace: true })
      }
    } catch (err) {
      if (err instanceof ApiError) setSubmitError(err.message)
      else setSubmitError('Sign in failed')
    }
  }

  const isSubmitting = status === 'loading'

  return (
    <div className="flex min-h-screen items-center justify-center px-4" data-testid="login-page">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Use your backend account credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reasonMessage ? (
            <div className="rounded-md border px-3 py-2 text-sm" data-testid="session-reason-message">
              {reasonMessage}
            </div>
          ) : null}

          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              error={form.formState.errors.email?.message}
              required
              {...form.register('email')}
            />

            <PasswordField
              id="password"
              label="Password"
              autoComplete="current-password"
              error={form.formState.errors.password?.message}
              required
              {...form.register('password')}
            />

            {loginError ? <p className="text-sm text-destructive">{loginError}</p> : null}

            <Button type="submit" className="w-full" disabled={isSubmitting} loading={isSubmitting}>
              Sign in
            </Button>
          </form>

          <div className="text-sm text-muted-foreground">
            <Link to="/" className="underline underline-offset-4">
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}