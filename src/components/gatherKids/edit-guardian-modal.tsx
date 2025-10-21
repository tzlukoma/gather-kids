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
import { Checkbox } from '@/components/ui/checkbox';
import { useAddGuardian, useUpdateGuardian } from '@/hooks/data';
import { useToast } from '@/hooks/use-toast';
import type { Guardian } from '@/lib/types';

const guardianSchema = z.object({
	first_name: z.string().min(1, 'First name is required'),
	last_name: z.string().min(1, 'Last name is required'),
	mobile_phone: z.string().min(1, 'Phone number is required'),
	email: z.string().email('Invalid email address').optional().or(z.literal('')),
	relationship: z.string().min(1, 'Relationship is required'),
	is_primary: z.boolean(),
});

type GuardianFormData = z.infer<typeof guardianSchema>;

interface EditGuardianModalProps {
	guardian: Guardian | null; // null for adding new guardian
	householdId: string;
	onClose: () => void;
}

export function EditGuardianModal({
	guardian,
	householdId,
	onClose,
}: EditGuardianModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();
	const addGuardianMutation = useAddGuardian();
	const updateGuardianMutation = useUpdateGuardian();

	const isEditing = !!guardian;

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<GuardianFormData>({
		resolver: zodResolver(guardianSchema),
		defaultValues: {
			first_name: guardian?.first_name || '',
			last_name: guardian?.last_name || '',
			mobile_phone: guardian?.mobile_phone || '',
			email: guardian?.email || '',
			relationship: guardian?.relationship || '',
			is_primary: guardian?.is_primary || false,
		},
	});

	const isPrimary = watch('is_primary');

	const onSubmit = async (data: GuardianFormData) => {
		setIsSubmitting(true);
		try {
			if (isEditing && guardian) {
				await updateGuardianMutation.mutateAsync({
					guardianId: guardian.guardian_id,
					householdId,
					data: {
						...data,
						email: data.email || undefined,
					},
				});
				toast({
					title: 'Guardian Updated',
					description: `${data.first_name} ${data.last_name} has been updated successfully.`,
				});
			} else {
				await addGuardianMutation.mutateAsync({
					householdId,
					guardian: {
						...data,
						email: data.email || undefined,
					},
				});
				toast({
					title: 'Guardian Added',
					description: `${data.first_name} ${data.last_name} has been added successfully.`,
				});
			}
			onClose();
		} catch (error) {
			console.error('Failed to save guardian:', error);
			toast({
				title: 'Save Failed',
				description: 'Could not save the guardian. Please try again.',
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
					<DialogTitle>
						{isEditing ? 'Edit Guardian' : 'Add Guardian'}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the guardian information below.'
							: 'Add a new guardian to this household.'}
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
						<Label htmlFor="email">Email (Optional)</Label>
						<Input
							id="email"
							type="email"
							{...register('email')}
							className={errors.email ? 'border-red-500' : ''}
						/>
						{errors.email && (
							<p className="text-sm text-red-500">{errors.email.message}</p>
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

					<div className="flex items-center space-x-2">
						<Checkbox
							id="is_primary"
							checked={isPrimary}
							onCheckedChange={(checked) => setValue('is_primary', !!checked)}
						/>
						<Label htmlFor="is_primary">Primary Guardian</Label>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
