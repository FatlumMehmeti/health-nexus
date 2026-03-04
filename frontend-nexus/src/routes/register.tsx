import { FormField } from '@/components/atoms/form-field';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { tenantsService } from '@/services/tenants.service';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  createFileRoute,
  useNavigate,
} from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export const Route = createFileRoute('/register')({
  component: TenantRegistrationPage,
});

const tenantFormSchema = z.object({
  name: z
    .string()
    .min(
      2,
      'Organization name must be at least 2 characters'
    ),
  email: z
    .string()
    .email('Please enter a valid email address'),
  licence_number: z
    .string()
    .min(3, 'Licence number must be at least 3 characters'),
});

type TenantFormValues = z.infer<typeof tenantFormSchema>;

function TenantRegistrationPage() {
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: tenantsService.createApplication,
    onSuccess: (data) => {
      toast.success('Application submitted successfully!', {
        description: `Your application is under review. Application ID: ${data.id}`,
      });
      form.reset();
      // Navigate to home or confirmation page after 2 seconds
      setTimeout(() => {
        navigate({ to: '/' });
      }, 2000);
    },
    onError: (err) => {
      toast.error('Failed to submit application', {
        description: (err as Error).message,
      });
    },
  });

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: '',
      email: '',
      licence_number: '',
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = (data: TenantFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            Join Health Nexus
          </CardTitle>
          <CardDescription>
            Submit your application to join our healthcare
            platform. We'll review your information and get
            back to you shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              id="name"
              label="Organization Name"
              error={errors.name?.message}
              placeholder="Your Healthcare Organization"
              {...register('name')}
            />
            <FormField
              id="email"
              label="Contact Email"
              type="email"
              error={errors.email?.message}
              placeholder="contact@yourhospital.com"
              {...register('email')}
            />
            <FormField
              id="licence_number"
              label="Medical Licence Number"
              error={errors.licence_number?.message}
              placeholder="MED-123456"
              {...register('licence_number')}
            />
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: '/' })}
                disabled={mutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1"
              >
                {mutation.isPending
                  ? 'Submitting...'
                  : 'Submit Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
