'use client';

import { useParams } from 'next/navigation';
import {
	useChild,
	useHousehold,
	useGuardians,
	useStudentAssignmentsQuery,
	useToggleScriptureMutation,
	useSubmitEssayMutation,
	useBibleBeeStats,
} from '@/hooks/data';
import { ChildIdCard } from '@/components/gatherKids/child-id-card';
import { updateChildPhoto } from '@/lib/dal';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import ScriptureCard from '@/components/gatherKids/scripture-card';
import { EssaySubmissions } from '@/components/gatherKids/essay-submissions';
import { SquareCropperModal } from '@/components/ui/square-cropper-modal';
import { useAuth } from '@/contexts/auth-context';
import { canUpdateChildPhoto } from '@/lib/permissions';
import { toast } from '@/hooks/use-toast';

interface ChildBibleBeeDetailProps {
	allowPhotoUpdates?: boolean;
}

export default function ChildBibleBeeDetail({
	allowPhotoUpdates = false,
}: ChildBibleBeeDetailProps) {
	const params = useParams();
	const childId = params.childId as string;
	const { user } = useAuth();
	const { data, isLoading } = useStudentAssignmentsQuery(childId);
	const [showPhotoCapture, setShowPhotoCapture] = useState<any>(null);
	const toggleMutation = useToggleScriptureMutation(childId);
	const essayMutation = useSubmitEssayMutation(childId);

	// Use React Query hooks for child, household, and guardian data
	const {
		data: childCore,
		isLoading: childLoading,
		error: childError,
	} = useChild(childId);

	const {
		data: household,
		isLoading: householdLoading,
		error: householdError,
	} = useHousehold(childCore?.household_id || '');

	const {
		data: guardiansForHousehold = [],
		isLoading: guardiansLoading,
		error: guardiansError,
	} = useGuardians();

	// Use React Query hook for Bible Bee stats
	const { 
		data: statsData, 
		isLoading: statsLoading 
	} = useBibleBeeStats(childId);

	const bbStats = statsData?.bbStats || null;
	const essaySummary = statsData?.essaySummary || null;
	const divisionEssayPrompts = statsData?.divisionEssayPrompts || [];
	const isComputingStats = statsLoading;

	if (
		isLoading ||
		childLoading ||
		householdLoading ||
		guardiansLoading ||
		statsLoading ||
		!data
	) {
		return <div>Loading Bible Bee assignments...</div>;
	}

	// Show error state if any of the queries failed
	if (childError || householdError || guardiansError) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-destructive">
					Error loading child data:{' '}
					{(childError as any)?.message ||
						(householdError as any)?.message ||
						(guardiansError as any)?.message}
				</div>
			</div>
		);
	}

	const enrichedChild = childCore
		? {
				...childCore,
				guardians: guardiansForHousehold || [],
				household: household || null,
				activeAttendance: null,
				emergencyContact: null,
				incidents: [],
				age: childCore.dob
					? new Date().getFullYear() - new Date(childCore.dob).getFullYear()
					: null,
		  }
		: null;

	console.log('Enriched child for display:', enrichedChild);
	console.log('Guardians count:', enrichedChild?.guardians?.length || 0);

	const handleUpdatePhoto = async (c: any) => {
		if (!c?.child_id || !user) return;

		// Check if user has permission to update this child's photo
		const hasPermission = canUpdateChildPhoto(user, c);
		if (!hasPermission) {
			toast({
				title: 'Permission Denied',
				description: "You do not have permission to update this child's photo.",
				variant: 'destructive',
			});
			return;
		}

		setShowPhotoCapture(c);
	};

	const handlePhotoSave = async (croppedBlob: Blob, croppedDataUrl: string) => {
		if (!showPhotoCapture?.child_id) return;

		try {
			await updateChildPhoto(showPhotoCapture.child_id, croppedDataUrl);

			// Photo update will be handled by React Query's automatic refetching
			// or we could invalidate the query cache if needed

			toast({
				title: 'Photo Updated',
				description: "The child's photo has been updated successfully.",
			});

			setShowPhotoCapture(null);
		} catch (error) {
			console.error('Error updating photo:', error);
			toast({
				title: 'Error',
				description: 'Failed to update the photo. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const handleViewPhoto = () => {
		// placeholder - parent layout may handle viewer
	};

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold font-headline">
				Bible Bee Assignments
			</h1>

			<ChildIdCard
				child={enrichedChild}
				onUpdatePhoto={allowPhotoUpdates ? handleUpdatePhoto : undefined}
				onViewPhoto={handleViewPhoto}
				bibleBeeStats={bbStats?.essayAssigned ? null : bbStats} // Hide scripture stats when essays are assigned
				essaySummary={bbStats?.essayAssigned ? essaySummary : null} // Show essay summary only when essays are assigned
				isComputingStats={isComputingStats}
			/>

			{/* Show different content based on whether the child's division has essays assigned */}
			{bbStats?.essayAssigned ? (
				<>
					{/* Show essays content */}
					<div>
						<h2 className="font-semibold text-2xl mb-3">Essays</h2>
						{divisionEssayPrompts && divisionEssayPrompts.length > 0 ? (
							<EssaySubmissions
								essays={data.essays}
								onSubmitEssay={(bibleBeeCycleId) =>
									essayMutation.mutate({ bibleBeeCycleId })
								}
							/>
						) : (
							<div className="text-center text-muted-foreground py-8">
								Essays are assigned to this division. Essays will appear here
								when they become available.
							</div>
						)}
					</div>
				</>
			) : (
				<>
					{/* Show scriptures content */}
					{data.scriptures && data.scriptures.length > 0 ? (
						<div>
							<h2 className="font-semibold text-2xl mb-3">Scriptures</h2>
							<div className="grid gap-2">
								{data.scriptures.map((s: any, idx: number) => (
									<ScriptureCard
										key={s.id}
										assignment={s}
										index={idx}
										onToggleAction={(id, next) =>
											toggleMutation.mutate({ id, complete: next })
										}
									/>
								))}
							</div>
						</div>
					) : (
						<div className="text-center text-muted-foreground py-8">
							No scriptures assigned yet.
						</div>
					)}
				</>
			)}

			{/* Photo Capture Modal - only show if photo updates are allowed */}
			{allowPhotoUpdates && (
				<SquareCropperModal
					isOpen={!!showPhotoCapture}
					onClose={() => setShowPhotoCapture(null)}
					onSave={handlePhotoSave}
					title={
						showPhotoCapture
							? `Update Photo for ${showPhotoCapture.first_name}`
							: ''
					}
					description="Use your camera to take a new photo or upload an existing one."
				/>
			)}
		</div>
	);
}
