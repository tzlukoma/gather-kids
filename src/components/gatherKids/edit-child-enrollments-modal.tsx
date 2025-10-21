import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
	useMinistries,
	useAddChildEnrollment,
	useRemoveChildEnrollment,
	useUpdateChildEnrollmentFields,
} from '@/hooks/data';
import { useToast } from '@/hooks/use-toast';
import { getCurrentRegistrationCycle } from '@/lib/dal';
import {
	differenceInYears,
	parseISO,
	isValid,
	isWithinInterval,
} from 'date-fns';
import type { Child, MinistryEnrollment, Ministry } from '@/lib/types';

// Eligibility checking functions (copied from registration page)
const getAgeFromDob = (dobString: string): number | null => {
	if (dobString && isValid(parseISO(dobString))) {
		return differenceInYears(new Date(), parseISO(dobString));
	}
	return null;
};

const checkEligibility = (program: Ministry, age: number | null): boolean => {
	if (program.min_age && age !== null && age < program.min_age) return false;
	if (program.max_age && age !== null && age > program.max_age) return false;

	if (program.code === 'bible-bee') {
		const today = new Date();
		const bibleBeeStart = program.open_at
			? parseISO(program.open_at)
			: new Date(today.getFullYear(), 0, 1);
		const bibleBeeEnd = program.close_at
			? parseISO(program.close_at)
			: new Date(today.getFullYear(), 9, 8);
		return isWithinInterval(today, { start: bibleBeeStart, end: bibleBeeEnd });
	}

	return true;
};

interface EditChildEnrollmentsModalProps {
	child: Child;
	householdId: string;
	currentEnrollments: Record<string, MinistryEnrollment[]>;
	onClose: () => void;
}

export function EditChildEnrollmentsModal({
	child,
	householdId,
	currentEnrollments,
	onClose,
}: EditChildEnrollmentsModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [currentCycleId, setCurrentCycleId] = useState<string | null>(null);
	const [selectedMinistries, setSelectedMinistries] = useState<Set<string>>(
		new Set()
	);
	const { toast } = useToast();

	const addEnrollmentMutation = useAddChildEnrollment();
	const removeEnrollmentMutation = useRemoveChildEnrollment();
	const updateEnrollmentMutation = useUpdateChildEnrollmentFields();

	const { data: ministries = [], isLoading: ministriesLoading } =
		useMinistries();

	// Filter ministries based on child eligibility
	const eligibleMinistries = ministries.filter((ministry) => {
		const age = getAgeFromDob(child.dob);
		return checkEligibility(ministry, age);
	});

	// Get current registration cycle
	useEffect(() => {
		const fetchCurrentCycle = async () => {
			try {
				const cycle = await getCurrentRegistrationCycle();
				setCurrentCycleId(cycle?.cycle_id || null);
			} catch (error) {
				console.error('Failed to get current registration cycle:', error);
			}
		};
		fetchCurrentCycle();
	}, []);

	// Initialize selected ministries from current enrollments
	useEffect(() => {
		if (currentEnrollments && currentCycleId) {
			const enrolledMinistries = currentEnrollments[currentCycleId] || [];
			const ministryIds = enrolledMinistries.map(
				(enrollment) => enrollment.ministry_id
			);
			setSelectedMinistries(new Set(ministryIds));
		}
	}, [currentEnrollments, currentCycleId]);

	const handleMinistryToggle = (ministryId: string) => {
		const newSelected = new Set(selectedMinistries);
		if (newSelected.has(ministryId)) {
			newSelected.delete(ministryId);
		} else {
			newSelected.add(ministryId);
		}
		setSelectedMinistries(newSelected);
	};

	const onSubmit = async () => {
		if (!currentCycleId) {
			toast({
				title: 'Error',
				description: 'No active registration cycle found.',
				variant: 'destructive',
			});
			return;
		}

		setIsSubmitting(true);
		try {
			// Get current enrollments for this cycle
			const currentEnrolledMinistries = (
				currentEnrollments[currentCycleId] || []
			).map((enrollment) => enrollment.ministry_id);

			// Remove enrollments that are no longer selected
			for (const ministryId of currentEnrolledMinistries) {
				if (!selectedMinistries.has(ministryId)) {
					await removeEnrollmentMutation.mutateAsync({
						childId: child.child_id,
						householdId,
						ministryId,
						cycleId: currentCycleId,
					});
				}
			}

			// Add new enrollments
			for (const ministryId of selectedMinistries) {
				if (!currentEnrolledMinistries.includes(ministryId)) {
					await addEnrollmentMutation.mutateAsync({
						childId: child.child_id,
						householdId,
						ministryId,
						cycleId: currentCycleId,
						customFields: {},
					});
				}
			}

			toast({
				title: 'Enrollments Updated',
				description: `${child.first_name}'s ministry enrollments have been updated successfully.`,
			});
			onClose();
		} catch (error) {
			console.error('Failed to update enrollments:', error);
			toast({
				title: 'Save Failed',
				description: 'Could not update ministry enrollments. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (ministriesLoading || !currentCycleId) {
		return (
			<Dialog open={true} onOpenChange={onClose}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>Edit Ministry Enrollments</DialogTitle>
						<DialogDescription>
							Loading ministry information...
						</DialogDescription>
					</DialogHeader>
					<div className="flex items-center justify-center py-8">
						<div className="text-muted-foreground">Loading...</div>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={true} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Ministry Enrollments</DialogTitle>
					<DialogDescription>
						Select the ministries that {child.first_name} should be enrolled in
						for the current registration cycle.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-3">
						<Label className="text-base font-semibold">
							Available Ministries
						</Label>
						{eligibleMinistries.length === 0 ? (
							<div className="text-muted-foreground py-4">
								No ministries available for {child.first_name}'s age group.
							</div>
						) : (
							eligibleMinistries.map((ministry) => (
								<div key={ministry.ministry_id} className="space-y-2">
									<div className="flex items-center space-x-3">
										<Checkbox
											id={ministry.ministry_id}
											checked={selectedMinistries.has(ministry.ministry_id)}
											onCheckedChange={() =>
												handleMinistryToggle(ministry.ministry_id)
											}
										/>
										<div className="flex-1">
											<Label
												htmlFor={ministry.ministry_id}
												className="text-sm font-medium cursor-pointer">
												{ministry.name}
											</Label>
											{ministry.description && (
												<p className="text-xs text-muted-foreground mt-1">
													{ministry.description}
												</p>
											)}
										</div>
									</div>
									<Separator />
								</div>
							))
						)}
					</div>

					{selectedMinistries.size > 0 && (
						<div className="space-y-2">
							<Label className="text-base font-semibold">
								Selected Ministries
							</Label>
							<div className="flex flex-wrap gap-2">
								{Array.from(selectedMinistries).map((ministryId) => {
									const ministry = eligibleMinistries.find(
										(m) => m.ministry_id === ministryId
									);
									return ministry ? (
										<Badge key={ministryId} variant="default">
											{ministry.name}
										</Badge>
									) : null;
								})}
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={onSubmit} disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Update Enrollments'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
