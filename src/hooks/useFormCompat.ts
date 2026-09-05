/**
 * React Compiler compatibility wrapper for react-hook-form
 *
 * React Hook Form v7 uses interior mutability (mutable refs and Proxy subscriptions)
 * that React Compiler cannot safely memoize. This wrapper contains the 'use no memo'
 * directive to opt out of compiler optimization for just the form hook, while allowing
 * the rest of the component tree to remain fully compiled.
 *
 * References:
 * - https://github.com/react-hook-form/react-hook-form/issues/12298
 * - https://hamzashabbir.dev/article/react-compiler-react-hook-form-use-no-memo-fix
 *
 * When react-hook-form v8 is stable and the compiler no longer bails out on it,
 * this wrapper can be removed and direct imports restored.
 *
 * @see https://github.com/tzlukoma/gather-kids/issues/295
 */
'use no memo';

import { useForm as useFormOriginal } from 'react-hook-form';
import type {
	FieldValues,
	UseFormProps,
	UseFormReturn,
} from 'react-hook-form';

/**
 * Drop-in replacement for react-hook-form's useForm that is compatible with React Compiler.
 *
 * Usage: Replace `import { useForm } from 'react-hook-form'` with
 * `import { useFormCompat as useForm } from '@/hooks/useFormCompat'`
 */
export function useFormCompat<
	TFieldValues extends FieldValues = FieldValues,
	TContext = any,
	TTransformedValues = TFieldValues,
>(
	props?: UseFormProps<TFieldValues, TContext, TTransformedValues>,
): UseFormReturn<TFieldValues, TContext, TTransformedValues> {
	return useFormOriginal<TFieldValues, TContext, TTransformedValues>(props);
}
