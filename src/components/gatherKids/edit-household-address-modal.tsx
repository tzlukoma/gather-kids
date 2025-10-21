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

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<HouseholdFormData>({
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
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Household Name</Label>
						<Input
							id="name"
							{...register('name')}
							className={errors.name ? 'border-red-500' : ''}
						/>
						{errors.name && (
							<p className="text-sm text-red-500">{errors.name.message}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="address_line1">Address Line 1</Label>
						<Input
							id="address_line1"
							{...register('address_line1')}
							className={errors.address_line1 ? 'border-red-500' : ''}
						/>
						{errors.address_line1 && (
							<p className="text-sm text-red-500">
								{errors.address_line1.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
						<Input
							id="address_line2"
							{...register('address_line2')}
							placeholder="Apartment, suite, etc."
						/>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label htmlFor="city">City</Label>
							<Input
								id="city"
								{...register('city')}
								className={errors.city ? 'border-red-500' : ''}
							/>
							{errors.city && (
								<p className="text-sm text-red-500">{errors.city.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="state">State</Label>
							<Input
								id="state"
								{...register('state')}
								className={errors.state ? 'border-red-500' : ''}
							/>
							{errors.state && (
								<p className="text-sm text-red-500">{errors.state.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="zip">ZIP Code</Label>
							<Input
								id="zip"
								{...register('zip')}
								className={errors.zip ? 'border-red-500' : ''}
							/>
							{errors.zip && (
								<p className="text-sm text-red-500">{errors.zip.message}</p>
							)}
						</div>
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
