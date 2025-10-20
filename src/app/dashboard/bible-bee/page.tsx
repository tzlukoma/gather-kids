'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { useBibleBeeCycles, useScripturesForCycle, useCanLeaderManageBibleBee } from '@/hooks/data';
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';
import LeaderBibleBeeProgress from '@/components/gatherKids/bible-bee-progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import ScriptureCard from '@/components/gatherKids/scripture-card';
import BibleBeeManage from '@/components/gatherKids/bible-bee-manage';
import BibleBeeDebugger from '@/components/gatherKids/bible-bee-debugger';

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

	// Use React Query hooks for data fetching
	const { 
		data: bibleBeeCycles = [], 
		isLoading: cyclesLoading, 
		error: cyclesError 
	} = useBibleBeeCycles();

	// Derive default cycle from data (React Query pattern)
	const getDefaultCycle = useMemo(() => {
		if (!bibleBeeCycles || bibleBeeCycles.length === 0) return null;
		
		// First, try to find an active Bible Bee cycle
		const activeBB = bibleBeeCycles.find((c: any) => {
			const val: any = c?.is_active;
			return val === true || val === 1 || String(val) === '1';
		});

		if (activeBB && activeBB.id) {
			return String(activeBB.id);
		}

		// If no active cycle, use the most recent cycle (sorted by created_at)
		const sortedCycles = [...bibleBeeCycles].sort((a: any, b: any) => {
			// Try to sort by name first (e.g., "Fall 2025", "Spring 2025")
			if (a.name && b.name) {
				return b.name.localeCompare(a.name);
			}
			// Fallback to created_at
			if (a.created_at && b.created_at) {
				return (
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);
			}
			return 0;
		});

		return sortedCycles.length > 0 ? String(sortedCycles[0].id) : null;
	}, [bibleBeeCycles]);

	// Only use state for user-initiated changes
	const [userSelectedCycle, setUserSelectedCycle] = useState<string | null>(null);

	// Use derived state for selected cycle
	const effectiveSelectedCycle = useMemo(() => {
		return userSelectedCycle || getDefaultCycle || '';
	}, [userSelectedCycle, getDefaultCycle]);

	const selectedCycle = effectiveSelectedCycle;

	// Use React Query for scriptures data
	const { 
		data: scriptures = [], 
		isLoading: scripturesLoading, 
		error: scripturesError 
	} = useScripturesForCycle(selectedCycle);
	// Derive available versions from scriptures data (React Query pattern)
	const availableVersions = useMemo(() => {
		if (!scriptures || scriptures.length === 0) return [];
		
		const versions = new Set<string>();
		for (const item of scriptures) {
			if (item.texts)
				Object.keys(item.texts).forEach((k) =>
					versions.add(k.toUpperCase())
				);
			if (item.translation)
				versions.add(String(item.translation).toUpperCase());
		}
		return Array.from(versions);
	}, [scriptures]);

	const [activeTab, setActiveTab] = useState<string>('students');
	const [displayVersion, setDisplayVersion] = useState<string | undefined>(undefined);
	const [canManage, setCanManage] = useState(false);

	// Derive display version from available versions
	const effectiveDisplayVersion = useMemo(() => {
		return displayVersion || (availableVersions.length > 0 ? availableVersions[0] : undefined);
	}, [displayVersion, availableVersions]);

	// Compute the proper year label for display
	const yearLabel = React.useMemo(() => {
		// Use Bible Bee cycles for new schema
		if (bibleBeeCycles && bibleBeeCycles.length > 0) {
			const bibleBeeCycle = bibleBeeCycles.find(
				(c: any) => c.id === selectedCycle
			);
			if (bibleBeeCycle && bibleBeeCycle.name) {
				return bibleBeeCycle.name;
			}
		}

		// Default fallback
		return `Bible Bee ${selectedCycle}`;
	}, [selectedCycle, bibleBeeCycles]);

	// leader list removed — Admin no longer filters by leader


	// Use React Query for permission checking
	const { data: canManagePermission = false } = useCanLeaderManageBibleBee({
		leaderId: user?.id || user?.uid || user?.user_id || user?.userId || null,
		email: user?.email || user?.user_email || user?.mail || null,
		selectedCycle,
	});

	// Determine manage permission: Admins can manage; Ministry leaders with Primary assignment can manage
	const effectiveCanManage = useMemo(() => {
		if (!user) return false;
		if (user?.metadata?.role === AuthRole.ADMIN) return true;
		if (user?.metadata?.role === AuthRole.MINISTRY_LEADER) return canManagePermission;
		return false;
	}, [user, canManagePermission]);

	// Show loading state while cycles are loading
	if (cyclesLoading) {
		return (
			<div className="flex flex-col gap-6">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-3xl font-bold font-headline">Bible Bee</h1>
					</div>
					<p className="text-muted-foreground">
						Loading Bible Bee data...
					</p>
				</div>
				<CardGridSkeleton />
			</div>
		);
	}

	// Show error state if cycles failed to load
	if (cyclesError) {
		return (
			<div className="flex flex-col gap-6">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-3xl font-bold font-headline">Bible Bee</h1>
					</div>
					<p className="text-muted-foreground">
						Error loading Bible Bee data.
					</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="text-destructive">Error loading Bible Bee cycles: {cyclesError.message}</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<div className="flex items-center gap-2">
					<h1 className="text-3xl font-bold font-headline">Bible Bee</h1>
				</div>
				<p className="text-muted-foreground">
					Progress and scriptures for the selected year.
				</p>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}>
				{/* make tabs only as wide as their content */}
				<TabsList className="inline-flex items-center gap-2">
					<TabsTrigger value="students">Students</TabsTrigger>
					<TabsTrigger value="scriptures">Scriptures</TabsTrigger>
					{effectiveCanManage && <TabsTrigger value="manage">Manage</TabsTrigger>}
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
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="scriptures">
					<Card>
						<CardHeader>
							<CardTitle>Scriptures for {yearLabel}</CardTitle>
							<CardDescription>
								Scriptures assigned for the selected competition year.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{scripturesLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-muted-foreground">Loading scriptures...</div>
								</div>
							) : scripturesError ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-destructive">Error loading scriptures: {scripturesError.message}</div>
								</div>
							) : scriptures.length === 0 ? (
								<div className="flex items-center justify-center py-8">
									<div className="text-muted-foreground">No scriptures defined for this year.</div>
								</div>
							) : (
								<>
									{availableVersions.length > 0 && (
										<div className="flex gap-2 mb-6">
											{availableVersions.map((v) => (
												<button
													key={v}
													onClick={() => setDisplayVersion(v)}
													aria-pressed={v === effectiveDisplayVersion}
													aria-label={`Show ${v}`}
													className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
														v === effectiveDisplayVersion
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
												if (!effectiveDisplayVersion) return true;
												const v = String(effectiveDisplayVersion).toUpperCase();
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
														competitionYearId: s.year_id || s.competitionYearId,
													}}
													index={idx}
													readOnly
													displayVersion={effectiveDisplayVersion}
												/>
											))}
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{effectiveCanManage && (
					<TabsContent value="manage">
						<BibleBeeManage bibleBeeYears={bibleBeeCycles} />
					</TabsContent>
				)}
			</Tabs>

			{!loading && user && <AuthLoader user={user} setAllowed={setAllowed} />}
			<BibleBeeDebugger />
		</div>
	);
}
