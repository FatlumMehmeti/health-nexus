import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usersService } from '@/services'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/atoms/form-field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/dashboard/forms')({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      form.reset()
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
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {mutation.error?.message ?? 'Submission failed'}
              </p>
            )}
            {mutation.isSuccess && (
              <p className="text-sm text-success">User added successfully (id: {mutation.data?.id})</p>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting...' : 'Add user'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
