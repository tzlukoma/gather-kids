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
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
	useAddChild,
	useUpdateChild,
	useAddChildEnrollment,
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
	const addChildEnrollmentMutation = useAddChildEnrollment();

	const isEditing = !!child;

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<ChildFormData>({
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

	const specialNeeds = watch('special_needs');

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

				const newChild = await addChildMutation.mutateAsync({
					householdId,
					child: {
						...data,
						child_mobile: data.child_mobile || undefined,
						allergies: data.allergies || undefined,
						medical_notes: data.medical_notes || undefined,
						special_needs_notes: data.special_needs_notes || undefined,
						photo_url: undefined,
						ministrySelections: {},
						interestSelections: {},
						customData: {},
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

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="dob">Date of Birth</Label>
							<Input
								id="dob"
								type="date"
								{...register('dob')}
								className={errors.dob ? 'border-red-500' : ''}
							/>
							{errors.dob && (
								<p className="text-sm text-red-500">{errors.dob.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="grade">Grade</Label>
							<Select
								value={watch('grade')}
								onValueChange={(value) => setValue('grade', value)}>
								<SelectTrigger className={errors.grade ? 'border-red-500' : ''}>
									<SelectValue placeholder="Select grade" />
								</SelectTrigger>
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
							{errors.grade && (
								<p className="text-sm text-red-500">{errors.grade.message}</p>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="child_mobile">Child's Phone (Optional)</Label>
						<PhoneInput
							id="child_mobile"
							value={watch('child_mobile') || ''}
							onChange={(value) => setValue('child_mobile', value)}
							placeholder="Phone number"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="allergies">Allergies/Medical Conditions</Label>
						<Textarea
							id="allergies"
							{...register('allergies')}
							placeholder="List any allergies or medical conditions"
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="medical_notes">Medical Notes</Label>
						<Textarea
							id="medical_notes"
							{...register('medical_notes')}
							placeholder="Additional medical information"
							rows={3}
						/>
					</div>

					<div className="space-y-4">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="special_needs"
								checked={specialNeeds}
								onCheckedChange={(checked) =>
									setValue('special_needs', !!checked)
								}
							/>
							<Label htmlFor="special_needs">Special Needs</Label>
						</div>

						{specialNeeds && (
							<div className="space-y-2">
								<Label htmlFor="special_needs_notes">Special Needs Notes</Label>
								<Textarea
									id="special_needs_notes"
									{...register('special_needs_notes')}
									placeholder="Describe special needs or accommodations"
									rows={3}
								/>
							</div>
						)}
					</div>

					<DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
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
