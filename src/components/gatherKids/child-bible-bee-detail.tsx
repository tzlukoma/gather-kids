'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
	useChild,
	useHousehold,
	useHouseholdProfile,
	useStudentAssignmentsQuery,
	useToggleScriptureMutation,
    useSubmitEssayMutation,
	useBibleBeeStats,
	useBibleBeeCycles,
	useChildEnrollments,
} from '@/hooks/data';
import { ChildIdCard } from '@/components/gatherKids/child-id-card';
import { updateChildPhoto } from '@/lib/dal';
import { useEffect, useState, useMemo } from 'react';
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
// PERF-06: Lazy-load the heavy cropper modal (812 lines + canvas deps) — only needed on demand
import dynamic from 'next/dynamic';
const SquareCropperModal = dynamic(
	() => import('@/components/ui/square-cropper-modal').then((m) => m.SquareCropperModal),
	{ loading: () => null }
);
import { useAuth } from '@/contexts/auth-context';
import { canUpdateChildPhoto } from '@/lib/permissions';
import { toast } from '@/hooks/use-toast';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { pickActiveBibleBeeCycle } from '@/lib/bible-bee-cycle';

interface ChildBibleBeeDetailProps {
	allowPhotoUpdates?: boolean;
}

export default function ChildBibleBeeDetail({
	allowPhotoUpdates = false,
}: ChildBibleBeeDetailProps) {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const childId = params.childId as string;
	const { user } = useAuth();
	
	// Load Bible Bee cycles for the year picker
	const {
		data: bibleBeeCycles = [],
		isLoading: cyclesLoading,
	} = useBibleBeeCycles();

	// Load child enrollments to filter cycles to only enrolled ones
	const {
		data: childEnrollments = [],
		isLoading: enrollmentsLoading,
	} = useChildEnrollments(childId);

	// Determine the selected cycle (from URL param or default to active/recent enrolled cycle)
	const urlCycleId = searchParams?.get('cycleId');
	
	const defaultCycle = useMemo(() => {
		if (!bibleBeeCycles || bibleBeeCycles.length === 0) return null;
		if (!childEnrollments || childEnrollments.length === 0) return null;
		
		// Filter to only cycles the child is enrolled in
		const enrolledCycleIds = new Set(
			childEnrollments.map((e: any) => e.bible_bee_cycle_id)
		);
		const enrolledCycles = bibleBeeCycles.filter((c: any) => 
			enrolledCycleIds.has(c.id)
		);
		
		if (enrolledCycles.length === 0) return null;
		
		// Use the shared utility to pick active cycle, or newest by name/created_at
		const pickedCycle = pickActiveBibleBeeCycle(enrolledCycles);
		return pickedCycle ? String(pickedCycle.id) : null;
	}, [bibleBeeCycles, childEnrollments]);

	const [userSelectedCycle, setUserSelectedCycle] = useState<string | null>(null);
	
	// Effective selected cycle: user selection > URL param > default
	// User selection must win to fix picker-stuck bug when landing with ?cycleId=
	const effectiveSelectedCycle = useMemo(() => {
		if (userSelectedCycle) return userSelectedCycle;
		if (urlCycleId) return urlCycleId;
		return defaultCycle || '';
	}, [userSelectedCycle, urlCycleId, defaultCycle]);
	
	// Use the selected cycle for data fetching
	const { data, isLoading } = useStudentAssignmentsQuery(childId, effectiveSelectedCycle);
	const [showPhotoCapture, setShowPhotoCapture] = useState<any>(null);
	const toggleMutation = useToggleScriptureMutation(childId, effectiveSelectedCycle);
	const essayMutation = useSubmitEssayMutation(childId, effectiveSelectedCycle);

	// Use React Query hooks for child, household, and guardian data
	const {
		data: childCore,
		isLoading: childLoading,
		error: childError,
	} = useChild(childId);

	const householdId = childCore?.household_id || '';
	
	const {
		data: household,
		isLoading: householdLoading,
		error: householdError,
	} = useHousehold(householdId);

	// Get guardians from household profile which includes all household data
	const {
		data: householdProfile,
		isLoading: profileLoading,
		error: profileError,
	} = useHouseholdProfile(householdId);
	
	// Extract guardians from household profile
	const guardiansForHousehold = householdProfile?.guardians || [];

	// Use React Query hook for Bible Bee stats
	const { 
		data: statsData, 
		isLoading: statsLoading 
	} = useBibleBeeStats(childId, effectiveSelectedCycle);

	const bbStats = statsData?.bbStats || null;
	const essaySummary = statsData?.essaySummary || null;
	const divisionEssayPrompts = statsData?.divisionEssayPrompts || [];
	const isComputingStats = statsLoading;

	if (
		isLoading ||
		childLoading ||
		householdLoading ||
		profileLoading ||
		statsLoading ||
		cyclesLoading ||
		enrollmentsLoading ||
		!data
	) {
		return <div>Loading Bible Bee assignments...</div>;
	}

	// Show error state if any of the queries failed
	if (childError || householdError || profileError) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-destructive">
					Error loading child data:{' '}
					{(childError as any)?.message ||
						(householdError as any)?.message ||
						(profileError as any)?.message}
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
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-3xl font-bold font-headline">
					Bible Bee Assignments
				</h1>
				
				{bibleBeeCycles.length > 1 && (
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Year:</span>
						<Select
							value={effectiveSelectedCycle}
							onValueChange={(value) => {
								setUserSelectedCycle(value);
								// Update URL using Next.js router to properly refresh searchParams
								router.replace(`?cycleId=${value}`, { scroll: false });
							}}
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Select year" />
							</SelectTrigger>
							<SelectContent>
								{bibleBeeCycles.map((cycle: any) => (
									<SelectItem key={cycle.id} value={cycle.id}>
										{cycle.name || cycle.id}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
			</div>

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
