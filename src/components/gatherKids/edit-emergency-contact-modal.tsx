import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<EmergencyContactFormData>({
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
				contact: data,
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
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="first_name">First Name</Label>
							<Input
								id="first_name"
								{...register('first_name')}
								className={errors.first_name ? 'border-red-500' : ''}
							/>
							{errors.first_name && (
								<p className="text-sm text-red-500">
									{errors.first_name.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="last_name">Last Name</Label>
							<Input
								id="last_name"
								{...register('last_name')}
								className={errors.last_name ? 'border-red-500' : ''}
							/>
							{errors.last_name && (
								<p className="text-sm text-red-500">
									{errors.last_name.message}
								</p>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="mobile_phone">Phone Number</Label>
						<PhoneInput
							id="mobile_phone"
							value={watch('mobile_phone')}
							onChange={(value) => setValue('mobile_phone', value)}
							className={errors.mobile_phone ? 'border-red-500' : ''}
						/>
						{errors.mobile_phone && (
							<p className="text-sm text-red-500">
								{errors.mobile_phone.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="relationship">Relationship</Label>
						<Input
							id="relationship"
							placeholder="e.g., Mother, Grandfather"
							{...register('relationship')}
							className={errors.relationship ? 'border-red-500' : ''}
						/>
						{errors.relationship && (
							<p className="text-sm text-red-500">
								{errors.relationship.message}
							</p>
						)}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Saving...' : 'Update'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
