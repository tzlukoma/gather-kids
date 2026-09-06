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
	TextareaFormField,
} from '@/components/ui/form-patterns';
import { PhoneInput } from '@/components/ui/phone-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	useAddChild,
	useUpdateChild,
} from '@/hooks/data';
import { useToast } from '@/hooks/use-toast';
import { getCurrentRegistrationCycle } from '@/lib/dal';
import type { Child } from '@/lib/types';

const childSchema = z.object({
	first_name: z.string().min(1, 'First name is required'),
	last_name: z.string().min(1, 'Last name is required'),
	dob: z.string().min(1, 'Date of birth is required'),
	grade: z.string().min(1, 'Grade is required'),
	child_mobile: z.string().optional(),
	allergies: z.string().optional(),
	medical_notes: z.string().optional(),
	special_needs: z.boolean(),
	special_needs_notes: z.string().optional(),
});

type ChildFormData = z.infer<typeof childSchema>;

interface EditChildModalProps {
	child: Child | null; // null for adding new child
	householdId: string;
	onClose: () => void;
}

export function EditChildModal({
	child,
	householdId,
	onClose,
}: EditChildModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();
	const addChildMutation = useAddChild();
	const updateChildMutation = useUpdateChild();

	const isEditing = !!child;

	const form = useForm<ChildFormData>({
		resolver: zodResolver(childSchema),
		defaultValues: {
			first_name: child?.first_name || '',
			last_name: child?.last_name || '',
			dob: child?.dob || '',
			grade: child?.grade || '',
			child_mobile: child?.child_mobile || '',
			allergies: child?.allergies || '',
			medical_notes: child?.medical_notes || '',
			special_needs: child?.special_needs || false,
			special_needs_notes: child?.special_needs_notes || '',
		},
	});

	const specialNeeds = form.watch('special_needs');

	const onSubmit = async (data: ChildFormData) => {
		setIsSubmitting(true);
		try {
			if (isEditing && child) {
				await updateChildMutation.mutateAsync({
					childId: child.child_id,
					householdId,
					data: {
						...data,
						child_mobile: data.child_mobile || undefined,
						allergies: data.allergies || undefined,
						medical_notes: data.medical_notes || undefined,
						special_needs_notes: data.special_needs_notes || undefined,
					},
				});
				toast({
					title: 'Child Updated',
					description: `${data.first_name} ${data.last_name} has been updated successfully.`,
				});
			} else {
				// For new children, get the current registration cycle and auto-enroll them
				const currentCycle = await getCurrentRegistrationCycle();
				if (!currentCycle) {
					throw new Error('No active registration cycle found');
				}

				await addChildMutation.mutateAsync({
					householdId,
					child: {
						...data,
						child_mobile: data.child_mobile || undefined,
						allergies: data.allergies || undefined,
						medical_notes: data.medical_notes || undefined,
						special_needs_notes: data.special_needs_notes || undefined,
						photo_url: undefined,
						household_id: householdId,
						is_active: true,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
					cycleId: currentCycle.cycle_id,
				});

				// Auto-enroll in current cycle (this would typically be done by the adapter)
				toast({
					title: 'Child Added',
					description: `${data.first_name} ${data.last_name} has been added and enrolled in the current registration cycle.`,
				});
			}
			onClose();
		} catch (error) {
			console.error('Failed to save child:', error);
			toast({
				title: 'Save Failed',
				description: 'Could not save the child. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={true} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Edit Child' : 'Add Child'}</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the child information below.'
							: 'Add a new child to this household.'}
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

						<div className="grid grid-cols-2 gap-4">
							<TextFormField
								control={form.control}
								name="dob"
								label="Date of Birth"
								type="date"
								required
							/>
							<FormField
								control={form.control}
								name="grade"
								render={({ field }) => (
									<FormFieldFrame label="Grade" required>
										<Select
											value={field.value}
											onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select grade" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="Pre-K">Pre-K</SelectItem>
												<SelectItem value="K">Kindergarten</SelectItem>
												<SelectItem value="1">1st Grade</SelectItem>
												<SelectItem value="2">2nd Grade</SelectItem>
												<SelectItem value="3">3rd Grade</SelectItem>
												<SelectItem value="4">4th Grade</SelectItem>
												<SelectItem value="5">5th Grade</SelectItem>
												<SelectItem value="6">6th Grade</SelectItem>
												<SelectItem value="7">7th Grade</SelectItem>
												<SelectItem value="8">8th Grade</SelectItem>
												<SelectItem value="9">9th Grade</SelectItem>
												<SelectItem value="10">10th Grade</SelectItem>
												<SelectItem value="11">11th Grade</SelectItem>
												<SelectItem value="12">12th Grade</SelectItem>
											</SelectContent>
										</Select>
									</FormFieldFrame>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="child_mobile"
							render={({ field }) => (
								<FormFieldFrame label="Child's Phone (Optional)">
									<FormControl>
										<PhoneInput
											id={field.name}
											value={field.value || ''}
											onChange={field.onChange}
											onBlur={field.onBlur}
											placeholder="Phone number"
										/>
									</FormControl>
								</FormFieldFrame>
							)}
						/>

						<TextareaFormField
							control={form.control}
							name="allergies"
							label="Allergies/Medical Conditions"
							placeholder="List any allergies or medical conditions"
							rows={3}
						/>

						<TextareaFormField
							control={form.control}
							name="medical_notes"
							label="Medical Notes"
							placeholder="Additional medical information"
							rows={3}
						/>

						<div className="space-y-4">
							<FormField
								control={form.control}
								name="special_needs"
								render={({ field }) => (
									<div className="flex items-center space-x-2">
										<Checkbox
											id="special_needs"
											checked={field.value}
											onCheckedChange={(checked) =>
												field.onChange(!!checked)
											}
										/>
										<Label htmlFor="special_needs">Special Needs</Label>
									</div>
								)}
							/>

							{specialNeeds && (
								<TextareaFormField
									control={form.control}
									name="special_needs_notes"
									label="Special Needs Notes"
									placeholder="Describe special needs or accommodations"
									rows={3}
								/>
							)}
						</div>

						<DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
							<FormActions
								onCancel={onClose}
								isSubmitting={isSubmitting}
								submitLabel={isEditing ? 'Update' : 'Add'}
							/>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
