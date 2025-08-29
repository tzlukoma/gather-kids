'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getBibleBeeProgressForCycle, getHouseholdProfile } from '@/lib/dal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/select';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import Link from 'next/link';
import { Trophy, BookOpen } from 'lucide-react';

export default function HouseholdBibleBeePage() {
	const { user } = useAuth();
	const [profileData, setProfileData] = useState<any>(null);
	const [rows, setRows] = useState<any[] | null>(null);
	const [selectedCycle, setSelectedCycle] = useState<string>('2025');
	const [availableGradeGroups, setAvailableGradeGroups] = useState<string[]>([]);

	const competitionYears = useLiveQuery(
		() => db.competitionYears.orderBy('year').reverse().toArray(),
		[]
	);

	useEffect(() => {
		const load = async () => {
			if (!user?.metadata?.household_id) return;
			const data = await getHouseholdProfile(user.metadata.household_id);
			setProfileData(data);
		};
		load();
	}, [user]);

	useEffect(() => {
		if (competitionYears && competitionYears.length > 0) {
			const defaultYear = String(competitionYears[0].year);
			setSelectedCycle(defaultYear);
		}
	}, [competitionYears]);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			if (!profileData) return;
			
			const res = await getBibleBeeProgressForCycle(selectedCycle);
			
			// Filter to only this household's children
			const householdChildIds = profileData.children.map((child: any) => child.child_id);
			const householdProgress = res.filter((progress: any) => 
				householdChildIds.includes(progress.childId)
			);

			if (mounted) {
				setRows(householdProgress);
				const groups = new Set<string>();
				householdProgress.forEach((r: any) => {
					if (r.gradeGroup) groups.add(r.gradeGroup);
				});
				setAvailableGradeGroups(Array.from(groups).sort());
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, [selectedCycle, profileData]);

	if (!profileData || !rows) return <div>Loading Bible Bee progress...</div>;

	if (rows.length === 0) {
		return (
			<div className="text-center py-8">
				<BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
				<p className="text-muted-foreground">No Bible Bee progress data found for your children.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-2">
				<Trophy className="h-6 w-6 text-primary" />
				<h2 className="text-2xl font-bold">Bible Bee Progress</h2>
			</div>

			<div className="flex items-center gap-4 mb-2">
				<div className="w-48">
					<Select
						value={selectedCycle}
						onValueChange={(v: any) => setSelectedCycle(String(v))}>
						<SelectTrigger>
							<SelectValue>{selectedCycle}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{(competitionYears || []).map((y: any) => (
								<SelectItem key={y.id} value={String(y.year)}>
									{String(y.year)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{rows.map((r: any) => {
				const denom = r.requiredScriptures || r.totalScriptures || 1;
				const pct = denom === 0 ? 0 : (r.completedScriptures / denom) * 100;
				
				return (
					<Card key={r.childId} className="w-full">
						<CardHeader>
							<CardTitle>{r.childName}</CardTitle>
							<CardDescription>
								Grade Group: {r.gradeGroup || 'N/A'} • Progress: {Math.round(pct)}%
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="text-sm text-muted-foreground">
								{(r.totalScriptures || r.requiredScriptures) > 0 ? (
									<>
										Scriptures: {r.completedScriptures}/
										{r.totalScriptures || r.requiredScriptures}
									</>
								) : (
									<>Essay: {r.essayStatus || 'none'}</>
								)}
							</div>
							<div className="mt-2">
								<Link
									href={`/household/children/${r.childId}/bible-bee`}
									className="text-primary underline">
									View Details & Mark Progress
								</Link>
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}