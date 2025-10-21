import { useState, useEffect, useMemo } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

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
	const [customFormData, setCustomFormData] = useState<Record<string, any>>({});
	const { toast } = useToast();

	const addEnrollmentMutation = useAddChildEnrollment();
	const removeEnrollmentMutation = useRemoveChildEnrollment();
	const updateEnrollmentMutation = useUpdateChildEnrollmentFields();

	const { data: ministries = [], isLoading: ministriesLoading } =
		useMinistries();

	// Organize ministries like the register page
	const { enrolledPrograms, interestPrograms } = useMemo(() => {
		if (!ministries) return { enrolledPrograms: [], interestPrograms: [] };
		const activeMinistries = ministries.filter((m) => m.is_active);
		const enrolled = activeMinistries
			.filter(
				(m) =>
					m.enrollment_type === 'enrolled' && m.code !== 'min_sunday_school'
			)
			.sort((a, b) => a.name.localeCompare(b.name));
		const interest = activeMinistries
			.filter((m) => m.enrollment_type === 'expressed_interest')
			.sort((a, b) => a.name.localeCompare(b.name));
		return { enrolledPrograms: enrolled, interestPrograms: interest };
	}, [ministries]);

	// Filter ministries based on child eligibility
	const eligibleEnrolledPrograms = enrolledPrograms.filter((ministry) => {
		const age = getAgeFromDob(child.dob);
		return checkEligibility(ministry, age);
	});

	const eligibleInterestPrograms = interestPrograms.filter((ministry) => {
		const age = getAgeFromDob(child.dob);
		return checkEligibility(ministry, age);
	});

	// Separate Sunday school from other ministries
	const sundaySchoolMinistry = ministries.find(
		(m) => m.code === 'min_sunday_school' && m.is_active
	);
	const otherMinistries = eligibleEnrolledPrograms.filter(
		(m) => m.code !== 'min_sunday_school'
	);

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

			// Always include Sunday school if the child is eligible
			const newSelectedMinistries = new Set(ministryIds);
			if (sundaySchoolMinistry) {
				newSelectedMinistries.add(sundaySchoolMinistry.ministry_id);
			}

			setSelectedMinistries(newSelectedMinistries);

			// Initialize custom form data from existing enrollments
			const existingCustomData: Record<string, any> = {};
			enrolledMinistries.forEach((enrollment) => {
				if (enrollment.custom_fields) {
					existingCustomData[enrollment.ministry_id] = enrollment.custom_fields;
				}
			});
			setCustomFormData(existingCustomData);
		}
	}, [currentEnrollments, currentCycleId, sundaySchoolMinistry]);

	const handleMinistryToggle = (ministryId: string) => {
		// Prevent Sunday school from being unselected
		if (
			sundaySchoolMinistry &&
			ministryId === sundaySchoolMinistry.ministry_id
		) {
			return;
		}

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

			// Ensure Sunday school is always included
			const finalSelectedMinistries = new Set(selectedMinistries);
			if (sundaySchoolMinistry) {
				finalSelectedMinistries.add(sundaySchoolMinistry.ministry_id);
			}

			// Remove enrollments that are no longer selected (except Sunday school)
			for (const ministryId of currentEnrolledMinistries) {
				if (!finalSelectedMinistries.has(ministryId)) {
					await removeEnrollmentMutation.mutateAsync({
						childId: child.child_id,
						householdId,
						ministryId,
						cycleId: currentCycleId,
					});
				}
			}

			// Add new enrollments
			for (const ministryId of finalSelectedMinistries) {
				if (!currentEnrolledMinistries.includes(ministryId)) {
					await addEnrollmentMutation.mutateAsync({
						childId: child.child_id,
						householdId,
						ministryId,
						cycleId: currentCycleId,
						customFields: customFormData[ministryId] || {},
					});
				} else {
					// Update existing enrollment with custom data if it has changed
					const customData = customFormData[ministryId];
					if (customData && Object.keys(customData).length > 0) {
						await updateEnrollmentMutation.mutateAsync({
							childId: child.child_id,
							householdId,
							ministryId,
							cycleId: currentCycleId,
							customFields: customData,
						});
					}
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

				<div className="space-y-6">
					{/* Sunday School - Always enrolled, cannot be unselected */}
					{sundaySchoolMinistry && (
						<div className="p-4 border rounded-md bg-muted/25">
							<h4 className="font-semibold">{sundaySchoolMinistry.name}</h4>
							{sundaySchoolMinistry.description && (
								<p className="text-sm text-muted-foreground mb-2">
									{sundaySchoolMinistry.description}
								</p>
							)}
							<div className="flex items-center space-x-3 mt-2">
								<input
									type="checkbox"
									checked={true}
									disabled={true}
									className="opacity-50"
								/>
								<Label className="text-sm font-medium text-muted-foreground">
									Automatically enrolled
								</Label>
							</div>
						</div>
					)}

					{/* Regular Ministry Programs */}
					{otherMinistries.length > 0 && (
						<div className="space-y-4">
							<h3 className="text-lg font-semibold font-headline">
								Ministry Programs
							</h3>
							{otherMinistries.map((ministry) => {
								const isSelected = selectedMinistries.has(ministry.ministry_id);
								const age = getAgeFromDob(child.dob);

								return (
									<div
										key={ministry.ministry_id}
										className="p-4 border rounded-md">
										<h4 className="font-semibold">{ministry.name}</h4>
										{ministry.description && (
											<p className="text-sm text-muted-foreground mb-2">
												{ministry.description}
											</p>
										)}
										<div className="flex items-center space-x-3 mt-2">
											<Checkbox
												id={ministry.ministry_id}
												checked={isSelected}
												onCheckedChange={() =>
													handleMinistryToggle(ministry.ministry_id)
												}
											/>
											<Label
												htmlFor={ministry.ministry_id}
												className="text-sm font-medium cursor-pointer">
												Enroll {child.first_name}
											</Label>
										</div>

										{/* Custom ministry forms */}
										{isSelected && ministry.code === 'dance' && (
											<div className="mt-4 space-y-4 p-4 border rounded-md">
												<Label className="text-sm font-medium">
													Are you a returning member of the dance ministry?
												</Label>
												<div className="flex flex-col space-y-2">
													<label className="flex items-center space-x-2">
														<input
															type="radio"
															name={`dance_returning_${ministry.ministry_id}`}
															value="yes"
															checked={
																customFormData[ministry.ministry_id]
																	?.dance_returning_member === 'yes'
															}
															onChange={(e) =>
																setCustomFormData((prev) => ({
																	...prev,
																	[ministry.ministry_id]: {
																		...prev[ministry.ministry_id],
																		dance_returning_member: e.target.value,
																	},
																}))
															}
														/>
														<span className="text-sm">Yes</span>
													</label>
													<label className="flex items-center space-x-2">
														<input
															type="radio"
															name={`dance_returning_${ministry.ministry_id}`}
															value="no"
															checked={
																customFormData[ministry.ministry_id]
																	?.dance_returning_member === 'no'
															}
															onChange={(e) =>
																setCustomFormData((prev) => ({
																	...prev,
																	[ministry.ministry_id]: {
																		...prev[ministry.ministry_id],
																		dance_returning_member: e.target.value,
																	},
																}))
															}
														/>
														<span className="text-sm">No</span>
													</label>
												</div>
											</div>
										)}
										{isSelected && ministry.code === 'bible-bee' && (
											<div className="mt-4 space-y-4 p-4 border rounded-md">
												<Label className="text-sm font-medium">
													Bible Bee Information
												</Label>
												<div className="space-y-2">
													<label className="flex items-center space-x-2">
														<input
															type="checkbox"
															checked={
																customFormData[ministry.ministry_id]
																	?.bible_bee_participant === true
															}
															onChange={(e) =>
																setCustomFormData((prev) => ({
																	...prev,
																	[ministry.ministry_id]: {
																		...prev[ministry.ministry_id],
																		bible_bee_participant: e.target.checked,
																	},
																}))
															}
														/>
														<span className="text-sm">
															I want to participate in Bible Bee
														</span>
													</label>
												</div>
											</div>
										)}

										{/* Custom questions */}
										{isSelected &&
											ministry.custom_questions &&
											ministry.custom_questions.length > 0 && (
												<div className="mt-4">
													<p className="font-medium mb-2 text-sm">
														Questions for {child.first_name}:
													</p>
													<div className="space-y-2 p-4 border rounded-md">
														{ministry.custom_questions.map((question) => (
															<label
																key={question.id}
																className="flex items-center space-x-2">
																<input
																	type="checkbox"
																	checked={
																		customFormData[ministry.ministry_id]?.[
																			question.id
																		] === true
																	}
																	onChange={(e) =>
																		setCustomFormData((prev) => ({
																			...prev,
																			[ministry.ministry_id]: {
																				...prev[ministry.ministry_id],
																				[question.id]: e.target.checked,
																			},
																		}))
																	}
																/>
																<span className="text-sm">{question.text}</span>
															</label>
														))}
													</div>
												</div>
											)}

										{/* Additional details */}
										{isSelected && ministry.details && (
											<Alert className="mt-4">
												<Info className="h-4 w-4" />
												<AlertDescription className="whitespace-pre-wrap">
													{ministry.details}
												</AlertDescription>
											</Alert>
										)}
									</div>
								);
							})}
						</div>
					)}

					{/* Interest Programs */}
					{eligibleInterestPrograms.length > 0 && (
						<div className="space-y-4">
							<h3 className="text-lg font-semibold font-headline">
								Programs of Interest
							</h3>
							<p className="text-sm text-muted-foreground">
								These programs help us gauge interest for future planning.
							</p>
							{eligibleInterestPrograms.map((ministry) => {
								const isSelected = selectedMinistries.has(ministry.ministry_id);

								return (
									<div
										key={ministry.ministry_id}
										className="p-4 border rounded-md">
										<h4 className="font-semibold">{ministry.name}</h4>
										{ministry.description && (
											<p className="text-sm text-muted-foreground mb-2">
												{ministry.description}
											</p>
										)}
										<div className="flex items-center space-x-3 mt-2">
											<Checkbox
												id={ministry.ministry_id}
												checked={isSelected}
												onCheckedChange={() =>
													handleMinistryToggle(ministry.ministry_id)
												}
											/>
											<Label
												htmlFor={ministry.ministry_id}
												className="text-sm font-medium cursor-pointer">
												Express interest for {child.first_name}
											</Label>
										</div>

										{/* Additional details */}
										{isSelected && ministry.details && (
											<Alert className="mt-4">
												<Info className="h-4 w-4" />
												<AlertDescription className="whitespace-pre-wrap">
													{ministry.details}
												</AlertDescription>
											</Alert>
										)}
									</div>
								);
							})}
						</div>
					)}

					{selectedMinistries.size > 0 && (
						<div className="space-y-2">
							<Label className="text-base font-semibold">
								Selected Ministries
							</Label>
							<div className="flex flex-wrap gap-2">
								{Array.from(selectedMinistries).map((ministryId) => {
									const ministry = [
										...otherMinistries,
										...eligibleInterestPrograms,
									].find((m) => m.ministry_id === ministryId);
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

				<DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
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
