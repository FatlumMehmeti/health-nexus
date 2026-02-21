/**
 * Minimal RBAC route guard tests.
 * Uses real route tree and auth store (setMockUser/clearAuth); no backend.
 */
import { jest } from '@jest/globals'
import { act, render, screen, waitFor } from '@testing-library/react'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from '../routeTree.gen'
import { fetchUsers } from '@/server/users'
import { useAuthStore } from '@/stores/auth.store'

// Dashboard index parses this; avoid loading the real file in Jest.
jest.mock('@/lib/dashboard-data.json', () => ({ __esModule: true, default: [] }), { virtual: true })

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function createTestRouter() {
  return createRouter({
    routeTree,
    defaultPreload: false,
  })
}

function renderApp(router: ReturnType<typeof createTestRouter>) {
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useAuthStore.getState().clearAuth()
})

describe('RBAC route guards', () => {
  it('redirects unauthenticated user to /login when visiting protected dashboard', async () => {
    const router = createTestRouter()
    renderApp(router)

    await act(async () => {
      router.navigate({ to: '/dashboard' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })

  it('redirects expired session to /login?reason=expired and shows message', async () => {
    // D) Session Expiration Handling test (no backend):
    // 1) Authenticate via store helper
    useAuthStore.getState().setMockUser('SUPER_ADMIN')
    // 2) Expire session (clears auth + sets reason)
    useAuthStore.getState().expireSession()
    const router = createTestRouter()
    renderApp(router)

    // 3) Attempt to access a protected route
    await act(async () => {
      router.navigate({ to: '/dashboard' })
    })

    // 4) Assert redirect + message
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
      expect(screen.getByTestId('session-reason-message')).toHaveTextContent(/Session expired/i)
    })
  })

  it('expires session on 401 when refresh fails, then redirects with message', async () => {
    const originalFetch = globalThis.fetch
    const originalRefresh = useAuthStore.getState().refresh

    const refreshSpy = jest.fn(async () => false)
    // Override refresh for this test only.
    useAuthStore.setState({ refresh: refreshSpy } as never)

    // Simulate an authenticated user hitting a protected API request.
    useAuthStore.getState().setMockUser('SUPER_ADMIN')

    globalThis.fetch = jest.fn(async () => new Response(null, { status: 401 })) as unknown as typeof fetch

    try {
      await expect(fetchUsers()).rejects.toThrow()
      expect(refreshSpy).toHaveBeenCalled()
      expect(useAuthStore.getState().authErrorReason).toBe('expired')
      expect(useAuthStore.getState().isAuthenticated).toBe(false)

      const router = createTestRouter()
      renderApp(router)

      await act(async () => {
        router.navigate({ to: '/dashboard' })
      })

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument()
        expect(screen.getByTestId('session-reason-message')).toHaveTextContent(/Session expired/i)
      })
    } finally {
      globalThis.fetch = originalFetch
      useAuthStore.setState({ refresh: originalRefresh } as never)
    }
  })

  it('redirects authenticated user with disallowed role to /unauthorized', async () => {
    useAuthStore.getState().setMockUser('CLIENT')
    const router = createTestRouter()
    renderApp(router)

    await act(async () => {
      router.navigate({ to: '/dashboard' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument()
    })
  })

  it('renders dashboard when authenticated with allowed role', async () => {
    useAuthStore.getState().setMockUser('SUPER_ADMIN')
    const router = createTestRouter()
    renderApp(router)

    await act(async () => {
      router.navigate({ to: '/dashboard' })
    })

    // Dashboard layout (sidebar) renders; main content may have chart/layout quirks in jsdom.
    await waitFor(() => {
      expect(screen.getByText('Health Nexus')).toBeInTheDocument()
    })
  })
})
