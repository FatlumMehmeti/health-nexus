import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_blog/blog/')({
  component: BlogIndexPage,
})

function BlogIndexPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Blog</h1>
      <p className="mt-4 text-muted-foreground">
        Explore our latest articles.
      </p>
      <ul className="mt-6 space-y-2">
        {[1, 2, 3].map((id) => (
          <li key={id}>
            <Link
              to="/blog/$postId"
              params={{ postId: String(id) }}
              className="text-primary hover:underline"
            >
              Post {id}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
