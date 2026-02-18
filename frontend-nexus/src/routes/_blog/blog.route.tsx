import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_blog/blog')({
  component: BlogLayout,
})

function BlogLayout() {
  return (
    <div className="p-8">
      <Outlet />
    </div>
  )
}
