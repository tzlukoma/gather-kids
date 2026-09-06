# Form patterns (MAINT-14)

Small helpers that compose the existing shadcn `Form` / react-hook-form primitives
(`FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`).

## Helpers

| Export | Purpose |
| --- | --- |
| `RequiredIndicator` | Asterisk next to required labels |
| `TextFormField` | Labeled text `Input` + validation message |
| `TextareaFormField` | Labeled `Textarea` + validation message |
| `FormFieldFrame` | Same chrome for custom controls (Select, PhoneInput, …) |
| `FormActions` | Cancel (`type="button"`) + submit (`type="submit"`) row |

## Usage

```tsx
import { Form } from '@/components/ui/form';
import {
  TextFormField,
  FormActions,
} from '@/components/ui/form-patterns';

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <TextFormField
      control={form.control}
      name="first_name"
      label="First Name"
      required
    />
    <FormActions
      onCancel={onClose}
      isSubmitting={isSubmitting}
      submitLabel="Update"
    />
  </form>
</Form>
```

For non-text controls, use `FormField` + `FormFieldFrame` + `FormControl`.

Do **not** replace large multi-step flows (e.g. register) wholesale — adopt helpers
where the labeled-input / submit-cancel repetition is clear.
