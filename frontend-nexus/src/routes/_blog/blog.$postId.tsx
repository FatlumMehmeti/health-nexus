import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_blog/blog/$postId')({
  component: BlogPostPage,
})

function BlogPostPage() {
  const { postId } = Route.useParams()

  return (
    <div>
      <h1 className="text-3xl font-bold">Post: {postId}</h1>
      <p className="mt-4 text-muted-foreground">
        Dynamic routing for blog post detail.
      </p>
    </div>
  )
}
