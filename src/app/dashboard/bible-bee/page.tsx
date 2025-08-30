'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/select';
import LeaderBibleBeeProgress from '@/components/gatherKids/bible-bee-progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import Link from 'next/link';
import ScriptureCard from '@/components/gatherKids/scripture-card';

function AuthLoader({ user, setAllowed }: any) {
	useEffect(() => {
		let mounted = true;
		const load = async () => {
			if (!user) return;

			if (user?.metadata?.role === AuthRole.ADMIN) {
				setAllowed(true);
				return;
			}

			if (user?.metadata?.role === AuthRole.MINISTRY_LEADER) {
				// If a ministry leader and assigned to bible-bee, allow; DAL check not required here
				setAllowed(true);
			}
		};

		load();
		return () => {
			mounted = false;
		};
	}, [user, setAllowed]);

	return null;
}

export default function BibleBeePage() {
	const { user, loading } = useAuth();
	const [allowed, setAllowed] = useState(false);
	const [selectedLeader, setSelectedLeader] = useState<string | null>(null);
	const [selectedCycle, setSelectedCycle] = useState<string>('');
	const competitionYears = useLiveQuery(
		() => db.competitionYears.orderBy('year').reverse().toArray(),
		[]
	);
	const [activeTab, setActiveTab] = useState<string>('students');
	const [scriptures, setScriptures] = useState<any[] | null>(null);
	const [displayVersion, setDisplayVersion] = useState<string | undefined>(
		undefined
	);
	const [availableVersions, setAvailableVersions] = useState<string[]>([]);
	const [canManage, setCanManage] = useState(false);

	// leader list removed — Admin no longer filters by leader

	// Initialize selectedCycle with the most recent competition year
	useEffect(() => {
		if (competitionYears && competitionYears.length > 0 && !selectedCycle) {
			setSelectedCycle(String(competitionYears[0].year));
		}
	}, [competitionYears, selectedCycle]);

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

	useEffect(() => {
		// determine manage permission: Admins can manage; Ministry leaders with Primary assignment can manage
		if (!user) return;
		if (user?.metadata?.role === AuthRole.ADMIN) {
			setCanManage(true);
			return;
		}
		if (user?.metadata?.role === AuthRole.MINISTRY_LEADER) {
			// simple check: if user has an assignment as Primary for bible-bee in current cycle
			(async () => {
				const uid =
					(user as any).id ||
					(user as any).uid ||
					(user as any).user_id ||
					(user as any).userId;
				if (!uid) return;
				const assignments = await db.leader_assignments
					.where({ leader_id: uid, cycle_id: selectedCycle })
					.toArray();
				const hasPrimary = assignments.some(
					(a: any) =>
						(a as any).ministry_id === 'bible-bee' &&
						(a as any).role === 'Primary'
				);
				setCanManage(hasPrimary);
			})();
		}
	}, [user, selectedCycle]);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold font-headline">Bible Bee</h1>
					<p className="text-muted-foreground">
						Progress and scriptures for the selected year.
					</p>
				</div>
				<div className="w-48">
					<Select
						value={selectedCycle}
						onValueChange={(v: string) => setSelectedCycle(v)}>
						<SelectTrigger>
							<SelectValue placeholder="Select year">
								{selectedCycle}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{(competitionYears || []).map((y: any) => (
								<SelectItem key={y.id} value={String(y.year)}>
									{String(y.year)} - {y.name || `Competition Year ${y.year}`}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				{/* make tabs only as wide as their content */}
				<TabsList className="inline-flex items-center gap-2">
					<TabsTrigger value="students">Students</TabsTrigger>
					<TabsTrigger value="scriptures">Scriptures</TabsTrigger>
					{canManage && <TabsTrigger value="manage">Manage</TabsTrigger>}
				</TabsList>

				<TabsContent value="students">
					<Card>
						<CardHeader>
							<CardTitle>All Participants</CardTitle>
							<CardDescription>
								All children enrolled in Bible Bee for the selected year.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<LeaderBibleBeeProgress 
								cycleId={selectedCycle}
								key={selectedCycle} // Force re-render when cycle changes
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

				{canManage && (
					<TabsContent value="manage">
						<Card>
							<CardHeader>
								<CardTitle>Manage Competition Years</CardTitle>
								<CardDescription>
									Manage competition years and scriptures.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<YearList />
							</CardContent>
						</Card>
					</TabsContent>
				)}
			</Tabs>

			{!loading && user && <AuthLoader user={user} setAllowed={setAllowed} />}
		</div>
	);
}

function YearList() {
	const years = useLiveQuery(
		() => db.competitionYears.orderBy('year').reverse().toArray(),
		[]
	);
	if (!years) return <div>Loading years...</div>;
	if (years.length === 0) return <div>No competition years defined.</div>;
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			{years.map((y: any) => (
				<Card key={y.id}>
					<CardHeader>
						<CardTitle>{y.name ?? y.year}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm text-muted-foreground">{y.description}</div>
						<div className="mt-2">
							<Link
								href={`/dashboard/bible-bee/year/${y.id}`}
								className="text-primary underline">
								Manage
							</Link>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
