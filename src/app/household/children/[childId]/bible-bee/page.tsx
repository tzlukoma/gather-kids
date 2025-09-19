'use client';

import { useParams } from 'next/navigation';
import {
	useStudentAssignmentsQuery,
	useToggleScriptureMutation,
	useSubmitEssayMutation,
} from '@/lib/hooks/useBibleBee';
import { ChildIdCard } from '@/components/gatherKids/child-id-card';
import {
	updateChildPhoto,
	getChild,
	getHousehold,
	listGuardians,
	getEssayPromptsForYearAndDivision,
} from '@/lib/dal';
import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { getApplicableGradeRule } from '@/lib/bibleBee';
import { gradeToCode } from '@/lib/gradeUtils';
import { useMemo } from 'react';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import ScriptureCard from '@/components/gatherKids/scripture-card';
import EssayCard from '@/components/gatherKids/essay-card';

export default function ChildBibleBeePage() {
	const params = useParams();
	const childId = params.childId as string;
	const { data, isLoading } = useStudentAssignmentsQuery(childId);
	const [childCore, setChildCore] = useState<any>(null);
	const [guardiansForHousehold, setGuardiansForHousehold] = useState<any[]>([]);
	const [household, setHousehold] = useState<any>(null);
	const toggleMutation = useToggleScriptureMutation(childId);
	const essayMutation = useSubmitEssayMutation(childId);

	// Load child, household, and guardians data using DAL functions
	useEffect(() => {
		const loadData = async () => {
			try {
				const child = await getChild(childId);
				setChildCore(child);

				if (child?.household_id) {
					const [householdData, guardiansData] = await Promise.all([
						getHousehold(child.household_id),
						listGuardians({ householdId: child.household_id }),
					]);
					setHousehold(householdData);
					setGuardiansForHousehold(guardiansData);
				}
			} catch (error) {
				console.error('Error loading child data:', error);
			}
		};

		loadData();
	}, [childId]);

	// Compute Bible Bee stats for the current competition year (if any)
	const [bbStats, setBbStats] = useState<{
		requiredScriptures: number;
		completedScriptures: number;
		percentDone: number;
		bonus: number;
		division?: {
			name: string;
			min_grade: number;
			max_grade: number;
		};
		essayAssigned?: boolean;
	} | null>(null);

	const [isComputingStats, setIsComputingStats] = useState(false);
	const [isPending, startTransition] = useTransition();

	const [essaySummary, setEssaySummary] = useState<{
		count: number;
		submitted: number;
		pending: number;
	} | null>(null);

	const [divisionEssayPrompts, setDivisionEssayPrompts] = useState<any[]>([]);

	useEffect(() => {
		const compute = async () => {
			if (!data) {
				setBbStats(null);
				setEssaySummary(null);
				setIsComputingStats(false);
				return;
			}

			setIsComputingStats(true);
			try {
				// Check if this child has essays assigned (essay track)
				const hasEssays = data.essays && data.essays.length > 0;
				
				if (hasEssays) {
					// Essay track - compute essay summary
					const essayCount = data.essays.length;
					const submittedCount = data.essays.filter((e: any) => e.status === 'submitted').length;
					const pendingCount = essayCount - submittedCount;
					
					setEssaySummary({
						count: essayCount,
						submitted: submittedCount,
						pending: pendingCount,
					});
					
					// Set essay assigned flag
					setBbStats({
						requiredScriptures: 0,
						completedScriptures: 0,
						percentDone: 0,
						bonus: 0,
						essayAssigned: true,
					});
				} else {
					// Scripture track - compute scripture stats
					const totalScriptures = data.scriptures?.length || 0;
					// Check both 'complete' property and 'status' property for compatibility
					const completedScriptures = data.scriptures?.filter((s: any) => 
						s.complete === true || s.status === 'completed'
					).length || 0;
					const percentDone = totalScriptures > 0 ? (completedScriptures / totalScriptures) * 100 : 0;
					
					// Calculate bonus (scriptures completed beyond required)
					const requiredScriptures = totalScriptures; // For now, all scriptures are required
					const bonus = Math.max(0, completedScriptures - requiredScriptures);
					
					setBbStats({
						requiredScriptures,
						completedScriptures,
						percentDone,
						bonus,
						essayAssigned: false,
					});
					
					setEssaySummary(null);
				}
			} catch (error) {
				console.error('Error computing Bible Bee stats:', error);
			} finally {
				setIsComputingStats(false);
			}
		};

		compute();
	}, [data]);

	// Create enriched child object for ChildIdCard
	const enrichedChild = useMemo(() => {
		if (!childCore) return null;
		
		return {
			...childCore,
			household: household,
			guardians: guardiansForHousehold,
		};
	}, [childCore, household, guardiansForHousehold]);

	const handleUpdatePhoto = async (child: any) => {
		// Photo update functionality (can be implemented later if needed)
		console.log('Photo update requested for child:', child);
	};

	const handleViewPhoto = (photo: { name: string; url: string } | null) => {
		// Photo view functionality (can be implemented later if needed)
		console.log('Photo view requested:', photo);
	};

	if (isLoading || !data) return <div>Loading Bible Bee assignments...</div>;

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold font-headline">Bible Bee Assignments</h1>

			<ChildIdCard
				child={enrichedChild}
				onUpdatePhoto={handleUpdatePhoto}
				onViewPhoto={handleViewPhoto}
				bibleBeeStats={bbStats?.essayAssigned ? null : bbStats} // Hide scripture stats when essays are assigned
				essaySummary={bbStats?.essayAssigned ? essaySummary : null} // Show essay summary only when essays are assigned
				isComputingStats={isComputingStats || isPending}
			/>

			{/* Show different content based on whether the child's division has essays assigned */}
			{bbStats?.essayAssigned ? (
				<>
					{/* Show essays content */}
					<div>
						<h2 className="font-semibold text-2xl mb-3">Essays</h2>
						<div className="space-y-2">
							{data.essays.map((e: any) => (
								<EssayCard
									key={e.id}
									essay={e}
									onSubmit={() =>
										essayMutation.mutate({
											bibleBeeCycleId: e.bible_bee_cycle_id,
										})
									}
								/>
							))}
						</div>
					</div>
				</>
			) : (
				<>
					{/* Show scriptures content */}
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
				</>
			)}
		</div>
	);
}
