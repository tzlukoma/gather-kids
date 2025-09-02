'use client';

import { useParams } from 'next/navigation';
import {
	useStudentAssignmentsQuery,
	useToggleScriptureMutation,
	useSubmitEssayMutation,
} from '@/lib/hooks/useBibleBee';
import { ChildIdCard } from '@/components/gatherKids/child-id-card';
import { updateChildPhoto } from '@/lib/dal';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
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
import { CheckCircle } from 'lucide-react';
import ScriptureCard from '@/components/gatherKids/scripture-card';
import EssayCard from '@/components/gatherKids/essay-card';

export default function DashboardChildBibleBeePage() {
	const params = useParams();
	const childId = params.childId as string;
	const { data, isLoading } = useStudentAssignmentsQuery(childId);
	const childCore = useLiveQuery(() => db.children.get(childId), [childId]);
	const guardiansForHousehold = useLiveQuery(async () => {
		if (!childCore?.household_id) return [];
		return db.guardians
			.where('household_id')
			.equals(childCore.household_id)
			.toArray();
	}, [childCore?.household_id]);
	const household = useLiveQuery(async () => {
		if (!childCore?.household_id) return null;
		return db.households.get(childCore.household_id);
	}, [childCore?.household_id]);
	const toggleMutation = useToggleScriptureMutation(childId);
	const essayMutation = useSubmitEssayMutation(childId);

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
				return;
			}

			const scriptures = data.scriptures || [];
			const essays = data.essays || [];

			// Prepare essay summary
			if (essays.length > 0 && scriptures.length === 0) {
				const submitted = essays.filter(
					(e: any) => e.status === 'submitted'
				).length;
				setEssaySummary({
					count: essays.length,
					submitted,
					pending: essays.length - submitted,
				});
			} else {
				setEssaySummary(null);
			}

			if (scriptures.length === 0) {
				// No scriptures to compute
				setBbStats(null);
				return;
			}
			// Get the year ID for division lookup - from scripture assignments it should be in competitionYearId
			const yearId = scriptures[0].competitionYearId;
			let required = scriptures.length;
			let matchingDivision = null;
			
			console.log('Computing Bible Bee stats for child:', childCore?.child_id);
			console.log('Child grade:', childCore?.grade);
			console.log('Scripture year ID (competitionYearId):', yearId);
			console.log('First scripture assignment:', scriptures[0]);
			
			try {
				const gradeNum = childCore?.grade ? gradeToCode(childCore.grade) : null;
				console.log('Parsed grade number:', gradeNum);
				
				if (gradeNum !== null && yearId && childCore) {
					// Use the helper function to get division information
					const { getChildDivisionInfo } = await import('@/lib/bibleBee');
					const divisionInfo = await getChildDivisionInfo(childCore.child_id, yearId);
					
					console.log('Division info from helper:', divisionInfo);
					
					if (divisionInfo.division) {
						// New system: Use division information
						matchingDivision = {
							name: divisionInfo.division.name,
							min_grade: divisionInfo.division.min_grade,
							max_grade: divisionInfo.division.max_grade,
						};
						// Use the minimum_required from the division
						required = divisionInfo.division.minimum_required || scriptures.length;
						console.log('Using division minimum_required:', required, 'from division:', divisionInfo.division.name);
					} else if (divisionInfo.target) {
						// Legacy system provided a target
						required = divisionInfo.target;
						console.log('Using legacy rule targetCount:', required);
					} else {
						console.log('No division or target found, using scripture count as fallback:', required);
					}
				} else {
					console.log('Missing required data for division lookup:', { gradeNum, yearId, hasChild: !!childCore });
				}
			} catch (e) {
				console.warn('Error computing Bible Bee stats:', e);
				// ignore and fallback to total scriptures
			}

			const completed = scriptures.filter(
				(s: any) => s.status === 'completed'
			).length;
			const percent = required > 0 ? (completed / required) * 100 : 0;
			const bonus = Math.max(0, completed - required);
			
			// Check if there's an essay assigned to the division
			let essayAssigned = false;
			if (matchingDivision && yearId) {
				try {
					const essayPrompts = await db.essay_prompts
						.where('year_id')
						.equals(yearId)
						.and(prompt => prompt.division_name === matchingDivision.name)
						.toArray();
					essayAssigned = essayPrompts.length > 0;
					setDivisionEssayPrompts(essayPrompts);
					console.log('Essay prompts for division:', matchingDivision.name, 'yearId:', yearId, essayPrompts);
				} catch (error) {
					console.warn('Error checking essay prompts:', error);
					essayAssigned = false;
					setDivisionEssayPrompts([]);
				}
			} else {
				setDivisionEssayPrompts([]);
			}
			
			setBbStats({
				requiredScriptures: required,
				completedScriptures: completed,
				percentDone: percent,
				bonus,
				division: matchingDivision ? {
					name: matchingDivision.name,
					min_grade: matchingDivision.min_grade,
					max_grade: matchingDivision.max_grade,
				} : undefined,
				essayAssigned
			});
		};
		compute();
	}, [data, childCore]);

	if (isLoading || !data) return <div>Loading Bible Bee assignments...</div>;

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

	const handleUpdatePhoto = async (c: any) => {
		// delegate to DAL if available
		if (!c || !c.child_id) return;
		// Show capture handled elsewhere; for now, open a placeholder
	};

	const handleViewPhoto = (p: any) => {
		// placeholder - parent layout may handle viewer
	};

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold font-headline">
				Bible Bee Assignments
			</h1>

			<ChildIdCard
				child={enrichedChild}
				onUpdatePhoto={handleUpdatePhoto}
				onViewPhoto={handleViewPhoto}
				bibleBeeStats={bbStats?.essayAssigned ? null : bbStats} // Hide scripture stats when essays are assigned
				essaySummary={bbStats?.essayAssigned ? essaySummary : null} // Show essay summary only when essays are assigned
			/>

			{/* Show different content based on whether the child's division has essays assigned */}
			{bbStats?.essayAssigned ? (
				<>
					{/* Show essays content */}
					<div>
						<h2 className="font-semibold text-2xl mb-3">Essays</h2>
						{divisionEssayPrompts && divisionEssayPrompts.length > 0 ? (
							<div className="space-y-2">
								{divisionEssayPrompts.map((prompt: any) => (
									<EssayCard key={prompt.id} essayPrompt={prompt} />
								))}
								
								{/* Show existing essay submissions if any */}
								{data.essays && data.essays.length > 0 && (
									<div className="mt-4">
										<h3 className="font-medium text-lg mb-2">Your Submissions</h3>
										{data.essays.map((e: any) => (
											<Card key={e.id}>
												<CardHeader>
													<CardTitle>Essay for {e.year?.year}</CardTitle>
													<CardDescription>{e.promptText}</CardDescription>
												</CardHeader>
												<CardContent>
													<div className="flex items-center gap-4">
														<div className="text-sm text-muted-foreground">
															Status: {e.status}
														</div>
														{e.status !== 'submitted' && (
															<Button
																onClick={() =>
																	essayMutation.mutate({
																		competitionYearId: e.competitionYearId,
																	})
																}
																size="sm">
																Mark Submitted
															</Button>
														)}
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								)}
							</div>
						) : (
							<div className="text-center text-muted-foreground py-8">
								Essays are assigned to this division. Essays will appear here when they become available.
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

			{/* duplicate essays block removed; page shows either Scriptures or Essays above */}
		</div>
	);
}
