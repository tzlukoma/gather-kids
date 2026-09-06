'use client';

/**
 * Shared form field patterns (MAINT-14 / Wave 6).
 *
 * Thin composition helpers on top of shadcn Form + react-hook-form.
 * Prefer these over repeating Label + Input + manual error markup.
 *
 * @see ./form-patterns.README.md
 */

import * as React from 'react';
import {
	type Control,
	type FieldPath,
	type FieldValues,
} from 'react-hook-form';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/** Red asterisk shown next to required field labels. */
function RequiredIndicator({ className }: { className?: string }) {
	return (
		<span
			className={cn('ml-0.5 text-destructive', className)}
			aria-hidden="true">
			*
		</span>
	);
}

type TextFormFieldProps<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
	control: Control<TFieldValues>;
	name: TName;
	label: React.ReactNode;
	/** When true, appends a RequiredIndicator to the label. */
	required?: boolean;
	description?: React.ReactNode;
	placeholder?: string;
	type?: React.ComponentProps<typeof Input>['type'];
	disabled?: boolean;
	autoComplete?: string;
	maxLength?: number;
	className?: string;
	inputClassName?: string;
};

/**
 * Labeled text input + error message via FormField / FormItem / FormLabel /
 * FormControl / FormMessage. Use inside a `<Form {...form}>` provider.
 */
function TextFormField<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	control,
	name,
	label,
	required,
	description,
	placeholder,
	type = 'text',
	disabled,
	autoComplete,
	maxLength,
	className,
	inputClassName,
}: TextFormFieldProps<TFieldValues, TName>) {
	return (
		<FormField
			control={control}
			name={name}
			render={({ field }) => (
				<FormItem className={className}>
					<FormLabel>
						{label}
						{required ? <RequiredIndicator /> : null}
					</FormLabel>
					<FormControl>
						<Input
							{...field}
							value={field.value ?? ''}
							type={type}
							placeholder={placeholder}
							disabled={disabled}
							autoComplete={autoComplete}
							maxLength={maxLength}
							className={inputClassName}
						/>
					</FormControl>
					{description ? (
						<FormDescription>{description}</FormDescription>
					) : null}
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

type TextareaFormFieldProps<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
	control: Control<TFieldValues>;
	name: TName;
	label: React.ReactNode;
	required?: boolean;
	description?: React.ReactNode;
	placeholder?: string;
	disabled?: boolean;
	rows?: number;
	className?: string;
	textareaClassName?: string;
};

/** Labeled textarea + error — same composition pattern as TextFormField. */
function TextareaFormField<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	control,
	name,
	label,
	required,
	description,
	placeholder,
	disabled,
	rows,
	className,
	textareaClassName,
}: TextareaFormFieldProps<TFieldValues, TName>) {
	return (
		<FormField
			control={control}
			name={name}
			render={({ field }) => (
				<FormItem className={className}>
					<FormLabel>
						{label}
						{required ? <RequiredIndicator /> : null}
					</FormLabel>
					<FormControl>
						<Textarea
							{...field}
							value={field.value ?? ''}
							placeholder={placeholder}
							disabled={disabled}
							rows={rows}
							className={textareaClassName}
						/>
					</FormControl>
					{description ? (
						<FormDescription>{description}</FormDescription>
					) : null}
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

type FormActionsProps = {
	/** Cancel / secondary handler. Omit to hide the cancel button. */
	onCancel?: () => void;
	cancelLabel?: React.ReactNode;
	submitLabel?: React.ReactNode;
	/** Shown while `isSubmitting` is true. Defaults to "Saving...". */
	submittingLabel?: React.ReactNode;
	isSubmitting?: boolean;
	submitDisabled?: boolean;
	className?: string;
	/** Extra props forwarded to the submit Button. */
	submitButtonProps?: React.ComponentProps<typeof Button>;
	cancelButtonProps?: React.ComponentProps<typeof Button>;
};

/**
 * Shared submit + optional cancel row. Place inside DialogFooter or at the
 * bottom of a form. Cancel is `type="button"`; submit is `type="submit"`.
 */
function FormActions({
	onCancel,
	cancelLabel = 'Cancel',
	submitLabel = 'Save',
	submittingLabel = 'Saving...',
	isSubmitting = false,
	submitDisabled,
	className,
	submitButtonProps,
	cancelButtonProps,
}: FormActionsProps) {
	return (
		<div
			className={cn(
				'flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2',
				className
			)}>
			{onCancel ? (
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isSubmitting}
					{...cancelButtonProps}>
					{cancelLabel}
				</Button>
			) : null}
			<Button
				type="submit"
				disabled={isSubmitting || submitDisabled}
				{...submitButtonProps}>
				{isSubmitting ? submittingLabel : submitLabel}
			</Button>
		</div>
	);
}

/**
 * Escape hatch: wrap custom controls (Select, PhoneInput, Checkbox, etc.)
 * with the same label / required / message chrome used by TextFormField.
 * Pass as the `render` prop of FormField, or use inside an existing FormField.
 */
type FormFieldFrameProps = {
	label: React.ReactNode;
	required?: boolean;
	description?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
};

function FormFieldFrame({
	label,
	required,
	description,
	className,
	children,
}: FormFieldFrameProps) {
	return (
		<FormItem className={className}>
			<FormLabel>
				{label}
				{required ? <RequiredIndicator /> : null}
			</FormLabel>
			{children}
			{description ? <FormDescription>{description}</FormDescription> : null}
			<FormMessage />
		</FormItem>
	);
}

export {
	RequiredIndicator,
	TextFormField,
	TextareaFormField,
	FormActions,
	FormFieldFrame,
};

export type {
	TextFormFieldProps,
	TextareaFormFieldProps,
	FormActionsProps,
	FormFieldFrameProps,
};

