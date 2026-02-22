import { createFileRoute, redirect} from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usersService } from '@/services'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/atoms/form-field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { canAccess } from '@/lib/rbacMatrix'
import { useAuthStore } from '@/stores/auth.store'

export const Route = createFileRoute('/dashboard/forms')({
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (!canAccess(role ?? undefined, 'DASHBOARD_FORMS')) throw redirect({ to: '/unauthorized' })
  },
  component: FormsExamplePage,
})

const formSchema = z.object({
  firstName: z.string().min(2, 'At least 2 characters'),
  lastName: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Invalid email'),
  age: z.string().refine(
    (s) => {
      const n = Number(s)
      return !Number.isNaN(n) && n >= 1 && n <= 150
    },
    'Age must be 1–150'
  ),
})

type FormValues = z.infer<typeof formSchema>

function FormsExamplePage() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: usersService.add,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      form.reset()
      toast.success('User added', { description: `Created with id: ${data?.id}` })
    },
    onError: (err) => {
      toast.error('Failed to add user', { description: (err as Error).message })
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      age: '',
    },
  })

  const { register, handleSubmit, formState: { errors } } = form

  const onSubmit = (data: FormValues) => {
    mutation.mutate({
      ...data,
      age: Number(data.age),
    })
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Form + Mutation</h1>
        <p className="mt-2 text-muted-foreground">
          React Hook Form, Zod validation, React Query mutation
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Add User</CardTitle>
          <CardDescription>
            Submits to DummyJSON API – simulated POST, no persistence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              id="firstName"
              label="First name"
              error={errors.firstName?.message}
              placeholder="John"
              {...register('firstName')}
            />
            <FormField
              id="lastName"
              label="Last name"
              error={errors.lastName?.message}
              placeholder="Doe"
              {...register('lastName')}
            />
            <FormField
              id="email"
              label="Email"
              type="email"
              error={errors.email?.message}
              placeholder="john@example.com"
              {...register('email')}
            />
            <FormField
              id="age"
              label="Age"
              type="number"
              error={errors.age?.message}
              placeholder="25"
              {...register('age')}
            />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting...' : 'Add user'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
