import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FormFieldProps extends Omit<React.ComponentProps<typeof Input>, 'id'> {
  id: string
  label: string
  error?: string
  wrapperClassName?: string
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ id, label, error, wrapperClassName, className, ...inputProps }, ref) => (
    <div className={cn('space-y-2', wrapperClassName)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={className}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
)

FormField.displayName = 'FormField'

export { FormField }
