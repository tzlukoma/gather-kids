'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getHouseholdProfile } from '@/lib/dal';
import { BibleBeeProgressList } from '@/components/gatherKids/bible-bee-progress-list';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import ScriptureCard from '@/components/gatherKids/scripture-card';
import { BookOpen } from 'lucide-react';

export default function HouseholdBibleBeePage() {
	const { user } = useAuth();
	const [profileData, setProfileData] = useState<any>(null);
	const [childIds, setChildIds] = useState<string[]>([]);
	const [selectedCycle, setSelectedCycle] = useState<string>('2025');
	const [activeTab, setActiveTab] = useState<string>('students');
	const [scriptures, setScriptures] = useState<any[] | null>(null);
	const [displayVersion, setDisplayVersion] = useState<string | undefined>(
		undefined
	);
	const [availableVersions, setAvailableVersions] = useState<string[]>([]);

	const competitionYears = useLiveQuery(
		() => db.competitionYears.orderBy('year').reverse().toArray(),
		[]
	);

	useEffect(() => {
		const load = async () => {
			if (!user?.metadata?.household_id) return;
			const data = await getHouseholdProfile(user.metadata.household_id);
			setProfileData(data);
			// Get list of child IDs for filtering
			const ids = data.children.map((child: any) => child.child_id);
			setChildIds(ids);
		};
		load();
	}, [user]);

	useEffect(() => {
		// load scriptures for selected cycle
		let mounted = true;
		const load = async () => {
			if (!competitionYears) return;
			const yearObj = competitionYears.find(
				(y: any) => String(y.year) === String(selectedCycle)
			);
			if (!yearObj) {
				setScriptures([]);
				return;
			}
			const s = await db.scriptures
				.where('competitionYearId')
				.equals(yearObj.id)
				.toArray();
			if (mounted) {
				const sorted = s.sort(
					(a: any, b: any) =>
						Number(a.order ?? a.sortOrder ?? 0) -
						Number(b.order ?? b.sortOrder ?? 0)
				);
				setScriptures(sorted);
				// collect available versions from scriptures texts maps and translation fields
				const versions = new Set<string>();
				for (const item of sorted) {
					if (item.texts)
						Object.keys(item.texts).forEach((k) =>
							versions.add(k.toUpperCase())
						);
					if (item.translation)
						versions.add(String(item.translation).toUpperCase());
				}
				const vlist = Array.from(versions);
				setAvailableVersions(vlist);
				// default to first available
				if (!displayVersion && vlist.length) setDisplayVersion(vlist[0]);
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, [selectedCycle, competitionYears]);

	if (!profileData) return <div>Loading Bible Bee progress...</div>;

	if (childIds.length === 0) {
		return (
			<div className="text-center py-8">
				<BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
				<p className="text-muted-foreground">No children found in your household.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold font-headline">Bible Bee</h1>
					<p className="text-muted-foreground">
						Progress and scriptures for your children in the selected year.
					</p>
				</div>
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

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="inline-flex items-center gap-2">
					<TabsTrigger value="students">Students</TabsTrigger>
					<TabsTrigger value="scriptures">Scriptures</TabsTrigger>
				</TabsList>

				<TabsContent value="students">
					<Card>
						<CardHeader>
							<CardTitle>Your Children's Progress</CardTitle>
							<CardDescription>
								Progress for your children enrolled in Bible Bee for {selectedCycle}.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<BibleBeeProgressList
								initialCycle={selectedCycle}
								filterChildIds={childIds}
								showGuardianInfo={false}
								showFilters={false}
								showYearSelection={false}
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="scriptures">
					<Card>
						<CardHeader>
							<CardTitle>Scriptures for {selectedCycle}</CardTitle>
							<CardDescription>
								Scriptures assigned for the selected competition year.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{!scriptures ? (
								<div>Loading scriptures...</div>
							) : scriptures.length === 0 ? (
								<div>No scriptures defined for this year.</div>
							) : (
								<>
									{availableVersions.length > 0 && (
										<div className="flex gap-2 mb-6">
											{availableVersions.map((v) => (
												<button
													key={v}
													onClick={() => setDisplayVersion(v)}
													aria-pressed={v === displayVersion}
													aria-label={`Show ${v}`}
													className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
														v === displayVersion
															? 'bg-primary text-primary-foreground shadow-sm'
															: 'bg-background text-muted-foreground border'
													}`}>
													{v}
												</button>
											))}
										</div>
									)}
									<div className="grid gap-2">
										{scriptures
											.filter((s: any) => {
												if (!displayVersion) return true;
												const v = String(displayVersion).toUpperCase();
												if (
													s.translation &&
													String(s.translation).toUpperCase() === v
												)
													return true;
												const keys = s.texts
													? Object.keys(s.texts).map((k: string) =>
															k.toUpperCase()
													  )
													: [];
												return keys.includes(v);
											})
											.map((s: any, idx: number) => (
												<ScriptureCard
													key={s.id}
													assignment={{
														id: s.id,
														scriptureId: s.id,
														scripture: s,
														verseText: s.text,
														competitionYearId: s.competitionYearId,
													}}
													index={idx}
													readOnly
													displayVersion={displayVersion}
												/>
											))}
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}