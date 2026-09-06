import { useState } from 'react';
import { useFormCompat as useForm } from '@/hooks/useFormCompat';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
} from '@/components/ui/form';
import {
	FormActions,
	FormFieldFrame,
	TextFormField,
} from '@/components/ui/form-patterns';
import { PhoneInput } from '@/components/ui/phone-input';
import { useUpdateEmergencyContact } from '@/hooks/data';
import { useToast } from '@/hooks/use-toast';
import type { EmergencyContact } from '@/lib/types';

const emergencyContactSchema = z.object({
	first_name: z.string().min(1, 'First name is required'),
	last_name: z.string().min(1, 'Last name is required'),
	mobile_phone: z.string().min(1, 'Phone number is required'),
	relationship: z.string().min(1, 'Relationship is required'),
});

type EmergencyContactFormData = z.infer<typeof emergencyContactSchema>;

interface EditEmergencyContactModalProps {
	contact: EmergencyContact;
	householdId: string;
	onClose: () => void;
}

export function EditEmergencyContactModal({
	contact,
	householdId,
	onClose,
}: EditEmergencyContactModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();
	const updateEmergencyContactMutation = useUpdateEmergencyContact();

	const form = useForm<EmergencyContactFormData>({
		resolver: zodResolver(emergencyContactSchema),
		defaultValues: {
			first_name: contact.first_name,
			last_name: contact.last_name,
			mobile_phone: contact.mobile_phone,
			relationship: contact.relationship,
		},
	});

	const onSubmit = async (data: EmergencyContactFormData) => {
		setIsSubmitting(true);
		try {
			await updateEmergencyContactMutation.mutateAsync({
				householdId,
				contact: { ...contact, ...data },
			});
			toast({
				title: 'Emergency Contact Updated',
				description: `${data.first_name} ${data.last_name} has been updated successfully.`,
			});
			onClose();
		} catch (error) {
			console.error('Failed to save emergency contact:', error);
			toast({
				title: 'Save Failed',
				description: 'Could not save the emergency contact. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={true} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Edit Emergency Contact</DialogTitle>
					<DialogDescription>
						Update the emergency contact information below.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<TextFormField
								control={form.control}
								name="first_name"
								label="First Name"
								required
							/>
							<TextFormField
								control={form.control}
								name="last_name"
								label="Last Name"
								required
							/>
						</div>

						<FormField
							control={form.control}
							name="mobile_phone"
							render={({ field }) => (
								<FormFieldFrame label="Phone Number" required>
									<FormControl>
										<PhoneInput
											id={field.name}
											value={field.value}
											onChange={field.onChange}
											onBlur={field.onBlur}
										/>
									</FormControl>
								</FormFieldFrame>
							)}
						/>

						<TextFormField
							control={form.control}
							name="relationship"
							label="Relationship"
							required
							placeholder="e.g., Mother, Grandfather"
						/>

						<DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
							<FormActions
								onCancel={onClose}
								isSubmitting={isSubmitting}
								submitLabel="Update"
							/>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
