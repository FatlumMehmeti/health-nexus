import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <nav className="border-b bg-muted/30 px-6 py-3">
        <ul className="flex gap-6">
          <li>
            <Link to="/" className="hover:text-primary" activeProps={{ className: 'font-semibold' }}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/about" className="hover:text-primary" activeProps={{ className: 'font-semibold' }}>
              About
            </Link>
          </li>
          <li>
            <Link to="/blog" className="hover:text-primary" activeProps={{ className: 'font-semibold' }}>
              Blog
            </Link>
          </li>
        </ul>
      </nav>
      <div className="min-h-screen">
        <Outlet />
      </div>
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}
