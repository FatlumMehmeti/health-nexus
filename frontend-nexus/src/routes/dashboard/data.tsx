import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usersService } from '@/services'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/data")({
  component: DataFetchingPage,
});

function DataFetchingPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersService.list(),
  });
  const queryClient = useQueryClient();
  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold">Data Fetching</h1>
          <p className="mt-2 text-muted-foreground">
            Users from DummyJSON API via React Query
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Data Fetching</h1>
        <p className="mt-4 text-destructive">
          Error: {error?.message ?? "Failed to load users"}
        </p>
      </div>
    );
  }

  const users = data?.users ?? [];

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Data Fetching</h1>
        <p className="mt-2 text-muted-foreground">
          {data?.total} users from API via React Query
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <Avatar>
                <AvatarImage src={user.image} alt={user.firstName} />
                <AvatarFallback>
                  {user.firstName[0]}
                  {user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <CardTitle className="text-base">
                  {user.firstName} {user.lastName}
                </CardTitle>
                <CardDescription>
                  {user.company?.title ?? user.email}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {user.company?.name}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button
        onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
        type="button"
      >
        Invalidate Users
      </Button>
    </div>
  );
}
