'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { db } from '@/lib/db';
import { dbAdapter } from '@/lib/db-utils';
import { canLeaderManageBibleBee, getCompetitionYears } from '@/lib/dal';
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

	// Add the debugger component to help troubleshoot
	// start empty and pick a sensible default once years data is available
	const [selectedCycle, setSelectedCycle] = useState<string>('');
	const [competitionYears, setCompetitionYears] = useState<any[]>([]);
	const [bibleBeeYears, setBibleBeeYears] = useState<any[]>([]);

	// Load data on component mount
	useEffect(() => {
		const fetchData = async () => {
			try {
				// Get Bible Bee years from adapter
				const beeYears = await dbAdapter.listBibleBeeYears();
				setBibleBeeYears(beeYears || []);

				// For competition years, we'll need to use direct DB access
				// as there's no adapter method for this legacy schema
				try {
					// Check if the db object has the competitionYears property
					// This will work with IndexedDB but may not with Supabase
					if (db && 'competitionYears' in db) {
						console.log('Using direct DB access for competition years');
						// Using direct Dexie access for legacy data
						const years = (await (db as any).competitionYears?.toArray()) || [];
						setCompetitionYears(years.sort((a, b) => b.year - a.year));
					} else {
						console.log(
							'No competition years table available in this database mode'
						);
						setCompetitionYears([]);
					}
				} catch (err) {
					console.error('Failed to load competition years:', err);
					setCompetitionYears([]);
				}
			} catch (error) {
				console.error('Failed to load Bible Bee data:', error);
			}
		};

		fetchData();
	}, []);
	const [activeTab, setActiveTab] = useState<string>('students');
	const [scriptures, setScriptures] = useState<any[] | null>(null);
	const [displayVersion, setDisplayVersion] = useState<string | undefined>(
		undefined
	);
	const [availableVersions, setAvailableVersions] = useState<string[]>([]);
	const [canManage, setCanManage] = useState(false);
	const [scriptureRefreshTrigger, setScriptureRefreshTrigger] = useState(0);

	// Compute the proper year label for display
	const yearLabel = React.useMemo(() => {
		// First check Bible Bee years for new schema
		if (bibleBeeYears && bibleBeeYears.length > 0) {
			const bibleBeeYear = bibleBeeYears.find(
				(y: any) =>
					(y.label &&
						typeof y.label === 'string' &&
						y.label.includes(selectedCycle)) ||
					y.id === selectedCycle
			);
			if (bibleBeeYear && bibleBeeYear.label) {
				return bibleBeeYear.label;
			}
		}

		// Fall back to competition years for legacy schema
		if (competitionYears) {
			const yearObj = competitionYears.find(
				(y: any) => String(y.year) === String(selectedCycle)
			);
			if (yearObj) {
				return yearObj.name ?? `Bible Bee ${yearObj.year}`;
			}
		}

		// Default fallback
		return `Bible Bee ${selectedCycle}`;
	}, [selectedCycle, competitionYears, bibleBeeYears]);

	// leader list removed — Admin no longer filters by leader

	useEffect(() => {
		// set an initial selectedCycle once we have years info; prefer an
		// explicitly active new-schema bible-bee year when present, otherwise
		// fall back to the latest competition year.
		if (selectedCycle) return; // don't override an existing selection
		if (!competitionYears && !bibleBeeYears) return;
		const activeBB = (bibleBeeYears || []).find((y: any) => {
			const val: any = y?.is_active;
			return val === true || val === 1 || String(val) === '1';
		});
		if (activeBB && activeBB.id) {
			setSelectedCycle(String(activeBB.id));
			return;
		}
		if (competitionYears && competitionYears.length > 0) {
			// Default to the prior year (second-most-recent) when no new-schema year exists
			const idx = competitionYears.length > 1 ? 1 : 0;
			setSelectedCycle(String(competitionYears[idx].year));
		}
	}, [competitionYears, bibleBeeYears, selectedCycle]);

	useEffect(() => {
		// load scriptures for selected cycle
		let mounted = true;
		const load = async () => {
			console.log('Loading scriptures for cycle:', selectedCycle);
			console.log('Available competition years:', competitionYears);
			console.log('Available Bible Bee years:', bibleBeeYears);

			let scriptures: any[] = [];

			// First try the new Bible Bee year system
			if (bibleBeeYears && bibleBeeYears.length > 0) {
				const bibleBeeYear = bibleBeeYears.find(
					(y: any) =>
						(y.label &&
							typeof y.label === 'string' &&
							y.label.includes(selectedCycle)) ||
						y.id === selectedCycle
				);

				if (bibleBeeYear) {
					console.log('Found Bible Bee year:', bibleBeeYear);
					try {
						// Check if db has scriptures table
						if (db && 'scriptures' in db) {
							// Use direct Dexie query for scriptures as adapter doesn't have this method
							scriptures =
								(await (db as any).scriptures
									?.where('year_id')
									?.equals(bibleBeeYear.id)
									?.toArray()) || [];
						} else {
							console.log(
								'No scriptures table available in this database mode'
							);
						}
						console.log(
							'Loaded scriptures from Bible Bee year:',
							scriptures.length
						);
					} catch (error) {
						console.error('Error loading scriptures:', error);
					}
				}
			}

			// If no scriptures found, try the old competition year system
			if (scriptures.length === 0 && competitionYears) {
				const yearObj = competitionYears.find(
					(y: any) => String(y.year) === String(selectedCycle)
				);

				if (yearObj) {
					console.log('Found competition year:', yearObj);
					try {
						// Check if db has scriptures table
						if (db && 'scriptures' in db) {
							// Use direct DB access for legacy competition year scriptures
							scriptures =
								(await (db as any).scriptures
									?.where('competitionYearId')
									?.equals(yearObj.id)
									?.toArray()) || [];
							console.log(
								'Loaded scriptures from competition year:',
								scriptures.length
							);
						} else {
							console.log(
								'No scriptures table available in this database mode'
							);
						}
					} catch (error) {
						console.error('Error loading legacy scriptures:', error);
					}
				}
			}

			if (mounted) {
				const sorted = scriptures.sort(
					(a: any, b: any) =>
						Number(a.sortOrder ?? a.scripture_order ?? 0) -
						Number(b.sortOrder ?? b.scripture_order ?? 0)
				);
				console.log('Setting scriptures:', sorted.length, 'scriptures');
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
	}, [selectedCycle, competitionYears, bibleBeeYears, scriptureRefreshTrigger]);

	useEffect(() => {
		// determine manage permission: Admins can manage; Ministry leaders with Primary assignment can manage
		if (!user) return;
		if (user?.metadata?.role === AuthRole.ADMIN) {
			setCanManage(true);
			return;
		}
		if (user?.metadata?.role === AuthRole.MINISTRY_LEADER) {
			(async () => {
				const uid =
					(user as any).id ||
					(user as any).uid ||
					(user as any).user_id ||
					(user as any).userId;
				const email =
					(user as any).email || (user as any).user_email || (user as any).mail;
				if (!uid && !email) return;
				const can = await canLeaderManageBibleBee({
					leaderId: uid,
					email: email,
					selectedCycle,
				});
				setCanManage(Boolean(can));
			})();
		}
	}, [user, selectedCycle, bibleBeeYears]);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold font-headline">Bible Bee</h1>
				<p className="text-muted-foreground">
					Progress and scriptures for the selected year.
				</p>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(tab) => {
					setActiveTab(tab);
					// Force refresh scriptures when switching to scriptures tab
					if (tab === 'scriptures') {
						setScriptureRefreshTrigger((prev) => prev + 1);
					}
				}}>
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
							<LeaderBibleBeeProgress cycleId={selectedCycle} />
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
														competitionYearId: s.year_id || s.competitionYearId,
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
						<BibleBeeManage />
					</TabsContent>
				)}
			</Tabs>

			{!loading && user && <AuthLoader user={user} setAllowed={setAllowed} />}
			<BibleBeeDebugger />
		</div>
	);
}

function YearList() {
	const [years, setYears] = useState<any[]>([]);

	useEffect(() => {
		const fetchYears = async () => {
			try {
				const data = await getCompetitionYears();
				setYears(data);
			} catch (error) {
				console.error('Error loading competition years:', error);
			}
		};
		fetchYears();
	}, []);
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
