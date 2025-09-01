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
	} | null>(null);

	const [essaySummary, setEssaySummary] = useState<{
		count: number;
		submitted: number;
		pending: number;
	} | null>(null);

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
			const competitionYearId = scriptures[0].competitionYearId;
			let required = scriptures.length;
			let matchingDivision = null;
			
			try {
				const gradeNum = childCore?.grade ? Number(childCore.grade) : NaN;
				console.log('Computing Bible Bee stats for child grade:', gradeNum, 'competitionYearId:', competitionYearId);
				
				if (!isNaN(gradeNum) && competitionYearId) {
					// First try to find a division for this year that matches the child's grade
					// Try both new system (year_id) and legacy system (competitionYearId fallback)
					let divisions = await db.divisions.where('year_id').equals(competitionYearId).toArray();
					console.log('Found divisions by year_id:', divisions.length, divisions);
					
					// If no divisions found by year_id, try to find the Bible Bee year that links to this competition year
					if (divisions.length === 0) {
						const bibleeBeeYear = await db.bible_bee_years.filter(by => 
							by.cycle_id === competitionYearId || by.id === competitionYearId
						).first();
						if (bibleeBeeYear) {
							divisions = await db.divisions.where('year_id').equals(bibleeBeeYear.id).toArray();
							console.log('Found divisions by Bible Bee year lookup:', divisions.length, divisions);
						}
					}
					
					matchingDivision = divisions.find(d => gradeNum >= d.min_grade && gradeNum <= d.max_grade);
					console.log('Matching division found:', matchingDivision);
					
					if (matchingDivision?.minimum_required) {
						required = matchingDivision.minimum_required;
						console.log('Using division minimum_required:', required);
					} else {
						// Fallback to legacy grade rule system if no division found
						console.log('No division found, falling back to legacy grade rules');
						const rule = await getApplicableGradeRule(
							competitionYearId,
							gradeNum
						);
						if (rule?.targetCount) {
							required = rule.targetCount;
							console.log('Using legacy rule targetCount:', required);
						}
					}
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
				bibleBeeStats={bbStats}
				essaySummary={essaySummary}
			/>

			{/* Show scriptures if present, otherwise show essays. Child can't have both. */}
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
			) : data.essays && data.essays.length > 0 ? (
				<div>
					<h2 className="font-semibold text-2xl mb-3">Essays</h2>
					<div className="space-y-2">
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
				</div>
			) : null}

			{/* duplicate essays block removed; page shows either Scriptures or Essays above */}
		</div>
	);
}
