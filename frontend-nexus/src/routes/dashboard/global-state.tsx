import { createFileRoute } from '@tanstack/react-router'
import { useAppStore } from '@/stores/use-app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/dashboard/global-state')({
  component: ZustandExamplePage,
})

function ZustandExamplePage() {
  const count = useAppStore((s) => s.count)
  const userName = useAppStore((s) => s.userName)
  const updateCount = useAppStore((s) => s.updateCount)
  const updateUserName = useAppStore((s) => s.updateUserName)
  const reset = useAppStore((s) => s.reset)

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Zustand – Global State</h1>
        <p className="mt-2 text-muted-foreground">
          Update state globally; it persists across the app.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Count</CardTitle>
            <CardDescription>Shared counter, updates globally</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-2xl font-mono">{count}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => updateCount(-1)}>
                −1
              </Button>
              <Button variant="outline" onClick={() => updateCount(1)}>
                +1
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Name</CardTitle>
            <CardDescription>Update from anywhere in the app</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                value={userName}
                onChange={(e) => updateUserName(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Current: <span className="font-medium">{userName}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <p className="text-muted-foreground">
            Global state – count and name update across all components using this store.
          </p>
          <Button variant="secondary" onClick={reset}>
            Reset
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
