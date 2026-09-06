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
import { Form } from '@/components/ui/form';
import {
	FormActions,
	TextFormField,
} from '@/components/ui/form-patterns';
import { useUpdateHousehold } from '@/hooks/data';
import { useToast } from '@/hooks/use-toast';
import type { Household } from '@/lib/types';

const householdSchema = z.object({
	name: z.string().min(1, 'Household name is required'),
	address_line1: z.string().min(1, 'Address is required'),
	address_line2: z.string().optional(),
	city: z.string().min(1, 'City is required'),
	state: z.string().min(1, 'State is required'),
	zip: z.string().min(1, 'ZIP code is required'),
});

type HouseholdFormData = z.infer<typeof householdSchema>;

interface EditHouseholdAddressModalProps {
	household: Household;
	onClose: () => void;
}

export function EditHouseholdAddressModal({
	household,
	onClose,
}: EditHouseholdAddressModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();
	const updateHouseholdMutation = useUpdateHousehold();

	const form = useForm<HouseholdFormData>({
		resolver: zodResolver(householdSchema),
		defaultValues: {
			name: household.name || '',
			address_line1: household.address_line1 || '',
			address_line2: household.address_line2 || '',
			city: household.city || '',
			state: household.state || '',
			zip: household.zip || '',
		},
	});

	const onSubmit = async (data: HouseholdFormData) => {
		setIsSubmitting(true);
		try {
			await updateHouseholdMutation.mutateAsync({
				householdId: household.household_id,
				data: {
					...data,
					address_line2: data.address_line2 || undefined,
				},
			});
			toast({
				title: 'Household Updated',
				description: 'Household information has been updated successfully.',
			});
			onClose();
		} catch (error) {
			console.error('Failed to save household:', error);
			toast({
				title: 'Save Failed',
				description:
					'Could not save the household information. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={true} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Edit Household Information</DialogTitle>
					<DialogDescription>
						Update the household address information below.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<TextFormField
							control={form.control}
							name="name"
							label="Household Name"
							required
						/>
						<TextFormField
							control={form.control}
							name="address_line1"
							label="Address Line 1"
							required
						/>
						<TextFormField
							control={form.control}
							name="address_line2"
							label="Address Line 2 (Optional)"
							placeholder="Apartment, suite, etc."
						/>
						<div className="grid grid-cols-3 gap-4">
							<TextFormField
								control={form.control}
								name="city"
								label="City"
								required
							/>
							<TextFormField
								control={form.control}
								name="state"
								label="State"
								required
							/>
							<TextFormField
								control={form.control}
								name="zip"
								label="ZIP Code"
								required
							/>
						</div>

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
