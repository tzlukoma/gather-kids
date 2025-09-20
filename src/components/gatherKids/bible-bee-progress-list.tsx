'use client';

import React, { useEffect, useState } from 'react';
import { getAllGuardians, getBibleBeeCycles } from '@/lib/dal';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/select';
import { getBibleBeeProgressForCycle } from '@/lib/dal';
import { BibleBeeProgressCard } from './bible-bee-progress-card';

interface BibleBeeProgressListProps {
	/** Initial cycle to display */
	initialCycle?: string;
	/** Filter to only these child IDs (for household view) */
	filterChildIds?: string[];
	/** Show guardian information on cards */
	showGuardianInfo?: boolean;
	/** Show filtering controls */
	showFilters?: boolean;
	/** Custom title */
	title?: string;
	/** Custom description */
	description?: string;
	/** Show year selection */
	showYearSelection?: boolean;
	/** Bible Bee cycles data passed from parent to avoid duplicate loading */
	bibleBeeYears?: any[];
}

export function BibleBeeProgressList({
	initialCycle,
	filterChildIds,
	showGuardianInfo = true,
	showFilters = true,
	title,
	description,
	showYearSelection = true,
	bibleBeeYears: propBibleBeeYears,
}: BibleBeeProgressListProps) {
	// Helpers
	function isActiveValue(v: unknown): boolean {
		return v === true || v === 1 || String(v) === '1' || String(v) === 'true';
	}
	function getValue(v: unknown): string {
		return typeof v === 'string' ? v : String(v ?? '');
	}
	const STORAGE_KEY = 'bb_progress_filters_v1';
	const [rows, setRows] = useState<any[] | null>(null);
	const [availableGradeGroups, setAvailableGradeGroups] = useState<string[]>(
		[]
	);

	// Use Bible Bee cycles from props, or load internally if not provided
	const [internalBibleBeeCycles, setInternalBibleBeeCycles] = useState<any[]>(
		[]
	);

	// Load Bible Bee cycles internally if not provided via props
	useEffect(() => {
		if (propBibleBeeYears && propBibleBeeYears.length > 0) {
			// Use data from props
			return;
		}

		// Fallback: load data internally if props are empty/undefined
		const loadData = async () => {
			try {
				const bbCycles = await getBibleBeeCycles();
				setInternalBibleBeeCycles(bbCycles || []);
			} catch (error) {
				console.error(
					'BibleBeeProgressList: Error loading Bible Bee data:',
					error
				);
				setInternalBibleBeeCycles([]);
			}
		};
		loadData();
	}, [propBibleBeeYears]);

	const bibleBeeCycles =
		propBibleBeeYears && propBibleBeeYears.length > 0
			? propBibleBeeYears
			: internalBibleBeeCycles;

	// Initialize filters from localStorage when possible so tab switches keep state
	const loadInitial = () => {
		try {
			if (typeof localStorage === 'undefined') return null;
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			return JSON.parse(raw);
		} catch (e) {
			return null;
		}
	};

	const initial = loadInitial();

	const [selectedCycle, setSelectedCycle] = useState<string>(
		initial?.selectedCycle ?? initialCycle ?? '2025'
	);
	const [displayCycleLabel, setDisplayCycleLabel] = useState<string | null>(
		null
	);
	const [filterGradeGroup, setFilterGradeGroup] = useState<string | 'all'>(
		initial?.filterGradeGroup ?? 'all'
	);
	const [filterStatus, setFilterStatus] = useState<
		'all' | 'Not Started' | 'In-Progress' | 'Complete'
	>(initial?.filterStatus ?? 'all');
	const [sortBy, setSortBy] = useState<
		'name-asc' | 'name-desc' | 'progress-desc' | 'progress-asc'
	>(initial?.sortBy ?? 'name-asc');

	useEffect(() => {
		if (bibleBeeCycles && bibleBeeCycles.length > 0) {
			// First try to find an active Bible Bee cycle
			const active = bibleBeeCycles.find((c: any) => {
				const val = c?.is_active;
				return (
					val === true ||
					val === 1 ||
					String(val) === '1' ||
					String(val) === 'true'
				);
			});
			if (active && active.id) {
				// default to the active Bible Bee cycle only if not set by storage
				if (!initial?.selectedCycle && !initialCycle) {
					setSelectedCycle(String(active.id));
				}
				return;
			}

			// If no active cycle, use the most recent cycle
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

			const defaultCycle = String(sortedCycles[0].id);
			// default to the most recent Bible Bee cycle only if not set by storage
			if (!initial?.selectedCycle && !initialCycle) {
				setSelectedCycle(String(defaultCycle ?? ''));
			}
		}
	}, [bibleBeeCycles, initial, initialCycle]);

	// Prefer an active new-schema Bible Bee cycle when present (only if no
	// selection was pre-populated via storage or props).
	useEffect(() => {
		if (bibleBeeCycles && bibleBeeCycles.length > 0) {
			if (!initial?.selectedCycle && !initialCycle) {
				// only default to a bible-bee-cycle when one is explicitly marked active
				const active = bibleBeeCycles.find((c: any) => {
					const val = c?.is_active;
					return (
						val === true ||
						val === 1 ||
						String(val) === '1' ||
						String(val) === 'true'
					);
				});
				if (active && active.id) {
					setSelectedCycle(String(active.id));
				}
			}
		}
	}, [bibleBeeCycles, initial, initialCycle]);

	useEffect(() => {
		console.log(
			'BibleBeeProgressList: useEffect triggered with dependencies:',
			{
				selectedCycle,
				filterChildIds,
				bibleBeeCyclesCount: bibleBeeCycles?.length,
				filterGradeGroup,
			}
		);

		let mounted = true;
		const load = async () => {
			// Determine effective cycle id to pass into DAL. If selectedCycle
			// matches a new-schema Bible Bee cycle id, pass that id through so the
			// DAL can use the `enrollments` table. Otherwise pass the legacy
			// selectedCycle through (which represents a competition year / cycle id).
			let effectiveCycle = selectedCycle;
			if (
				bibleBeeCycles &&
				bibleBeeCycles.find((c: any) => String(c.id) === String(selectedCycle))
			) {
				effectiveCycle = String(selectedCycle);
			}
			const res = await getBibleBeeProgressForCycle(effectiveCycle);
			if (mounted) {
				// Filter to specific children if provided
				const filteredRes = filterChildIds
					? res.filter((r: any) => filterChildIds.includes(r.childId))
					: res;

				// Prefetch guardians for rows' households to ensure primary guardian is available
				const householdIds = Array.from(
					new Set(
						filteredRes.map((r: any) => r.child?.household_id).filter(Boolean)
					)
				);
				const guardianMap = new Map<string, any>();
				if (householdIds.length > 0) {
					const allGuardians = await getAllGuardians();
					const guardians = allGuardians.filter((g) =>
						householdIds.includes(g.household_id)
					);
					for (const g of guardians) {
						if (!guardianMap.has(g.household_id))
							guardianMap.set(g.household_id, []);
						guardianMap.get(g.household_id).push(g);
					}
				}

				const resWithGuardians = filteredRes.map((r: any) => {
					const existing = r.primaryGuardian ?? null;
					if (existing) return r;
					const guardiansForHouse =
						guardianMap.get(r.child?.household_id) || [];
					const primary =
						guardiansForHouse.find((g: any) => g.is_primary) ||
						guardiansForHouse[0] ||
						null;
					return { ...r, primaryGuardian: primary };
				});

				setRows(resWithGuardians);
				const groups = new Set<string>();
				resWithGuardians.forEach((r: any) => {
					if (r.gradeGroup) groups.add(r.gradeGroup);
				});
				const sortedGroups = Array.from(groups).sort();
				setAvailableGradeGroups(sortedGroups);
				// If stored gradeGroup no longer exists for this year, reset to 'all'
				if (
					filterGradeGroup !== 'all' &&
					!sortedGroups.includes(filterGradeGroup)
				) {
					setFilterGradeGroup('all');
				}
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, [selectedCycle, filterChildIds, bibleBeeCycles, filterGradeGroup]);

	// Resolve a friendly label for the selected cycle when bibleBeeCycles
	// isn't yet available (prevents showing UUID on first load).
	useEffect(() => {
		let mounted = true;
		const resolveLabel = async () => {
			setDisplayCycleLabel(null);
			if (!selectedCycle) return;
			// Prefer the live query value if available
			const bbFromLive = (bibleBeeCycles || []).find(
				(c: any) => String(c.id) === String(selectedCycle)
			);
			if (bbFromLive) {
				if (mounted) setDisplayCycleLabel(bbFromLive.name ?? null);
				return;
			}
			// Otherwise try a DB lookup (async) to resolve label for UUIDs
			try {
				const allCycles = await getBibleBeeCycles();
				const maybe = allCycles.find((c) => c.id === String(selectedCycle));
				if (mounted && maybe && maybe.name) setDisplayCycleLabel(maybe.name);
			} catch (e) {
				// ignore
			}
		};
		resolveLabel();
		return () => {
			mounted = false;
		};
	}, [selectedCycle, bibleBeeCycles]);

	// persist filter state so switching tabs (which may unmount) preserves selections
	useEffect(() => {
		if (showFilters) {
			try {
				const payload = {
					selectedCycle,
					filterGradeGroup,
					filterStatus,
					sortBy,
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			} catch (e) {
				// ignore storage failures
			}
		}
	}, [selectedCycle, filterGradeGroup, filterStatus, sortBy, showFilters]);

	if (!rows) return <div>Loading Bible Bee progress...</div>;

	const filtered = rows.filter((r: any) => {
		if (filterGradeGroup !== 'all') {
			if (r.gradeGroup !== filterGradeGroup) return false;
		}
		if (filterStatus !== 'all') {
			if (filterStatus === 'Complete') {
				// Treat submitted essays (for children with no scriptures) as Complete
				const isEssayComplete =
					(r.totalScriptures || 0) === 0 && r.essayStatus === 'submitted';
				return r.bibleBeeStatus === 'Complete' || isEssayComplete;
			}
			return r.bibleBeeStatus === filterStatus;
		}
		return true;
	});

	const withProgress = filtered.map((r: any) => {
		// For essay tracks, use a different progress calculation
		if ((r.totalScriptures || 0) === 0 && r.essayStatus) {
			// Essay tracks: 0% for assigned, 100% for submitted
			const pct = r.essayStatus === 'submitted' ? 100 : 0;
			return { ...r, progressPct: pct };
		} else {
			// Scripture tracks: normal percentage calculation using requiredScriptures as denominator
			const denom = r.requiredScriptures || 1;
			const pct = denom === 0 ? 0 : (r.completedScriptures / denom) * 100;
			return { ...r, progressPct: pct };
		}
	});

	const sorted = withProgress.sort((a: any, b: any) => {
		switch (sortBy) {
			case 'name-asc':
				return a.childName.localeCompare(b.childName);
			case 'name-desc':
				return b.childName.localeCompare(a.childName);
			case 'progress-desc':
				return b.progressPct - a.progressPct;
			case 'progress-asc':
				return a.progressPct - b.progressPct;
			default:
				return 0;
		}
	});

	return (
		<div className="space-y-4">
			{title && (
				<div>
					<h1 className="text-3xl font-bold font-headline">{title}</h1>
					{description && (
						<p className="text-muted-foreground">{description}</p>
					)}
				</div>
			)}

			{(showFilters || showYearSelection) && (
				<div className="flex items-center gap-4 mb-2">
					{showYearSelection && (
						<div className="w-48">
							<Select
								value={selectedCycle}
								onValueChange={(v: any) => setSelectedCycle(String(v))}>
								<SelectTrigger>
									<SelectValue>
										{(() => {
											if (displayCycleLabel) return displayCycleLabel;
											const bb = (bibleBeeCycles || []).find(
												(c: any) => String(c.id) === String(selectedCycle)
											);
											if (bb) return bb.name;
											// If we don't have a name yet but the selectedCycle looks like a UUID,
											// show a friendly placeholder instead of the raw id.
											if (
												selectedCycle &&
												/^[0-9a-fA-F-]{36}$/.test(String(selectedCycle))
											)
												return 'Selected cycle...';
											return selectedCycle;
										})()}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{/* Bible Bee cycles */}
									{(bibleBeeCycles || []).map((c: any) => (
										<SelectItem key={`bb-${c.id}`} value={c.id}>
											{c.name || `Bible Bee ${c.id}`}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{showFilters && (
						<>
							<div className="w-56">
								<Select
									value={filterGradeGroup}
									onValueChange={(v: unknown) =>
										setFilterGradeGroup(getValue(v) as unknown as string)
									}>
									<SelectTrigger>
										<SelectValue>
											{filterGradeGroup === 'all'
												? 'All Divisions'
												: filterGradeGroup}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={'all'}>All Divisions</SelectItem>
										{availableGradeGroups.map((g) => (
											<SelectItem key={g} value={g}>
												{g}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="w-48">
								<Select
									value={sortBy}
									onValueChange={(v: unknown) =>
										setSortBy(
											getValue(v) as unknown as
												| 'name-asc'
												| 'name-desc'
												| 'progress-desc'
												| 'progress-asc'
										)
									}>
									<SelectTrigger>
										<SelectValue>
											{sortBy === 'name-asc' && 'Name (A → Z)'}
											{sortBy === 'name-desc' && 'Name (Z → A)'}
											{sortBy === 'progress-desc' && 'Progress (High → Low)'}
											{sortBy === 'progress-asc' && 'Progress (Low → High)'}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={'name-asc'}>Name (A → Z)</SelectItem>
										<SelectItem value={'name-desc'}>Name (Z → A)</SelectItem>
										<SelectItem value={'progress-desc'}>
											Progress (High → Low)
										</SelectItem>
										<SelectItem value={'progress-asc'}>
											Progress (Low → High)
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex items-center gap-2">
								<button
									className={`px-3 py-1 rounded ${
										filterStatus === 'all' ? 'bg-accent' : ''
									}`}
									onClick={() => setFilterStatus('all')}>
									All
								</button>
								<button
									className={`px-3 py-1 rounded ${
										filterStatus === 'Not Started' ? 'bg-accent' : ''
									}`}
									onClick={() => setFilterStatus('Not Started')}>
									Not Started
								</button>
								<button
									className={`px-3 py-1 rounded ${
										filterStatus === 'In-Progress' ? 'bg-accent' : ''
									}`}
									onClick={() => setFilterStatus('In-Progress')}>
									In-Progress
								</button>
								<button
									className={`px-3 py-1 rounded ${
										filterStatus === 'Complete' ? 'bg-accent' : ''
									}`}
									onClick={() => setFilterStatus('Complete')}>
									Complete
								</button>
								<div className="flex-1" />
								<button
									className="px-2 py-1 border rounded"
									onClick={() => {
										// reset to defaults
										if (bibleBeeCycles && bibleBeeCycles.length > 0) {
											// Use active cycle if available, otherwise most recent
											const active = bibleBeeCycles.find(
												(c: any) => c.is_active
											);
											const defaultCycle = active
												? active.id
												: bibleBeeCycles[0].id;
											setSelectedCycle(String(defaultCycle));
										}
										setFilterGradeGroup('all');
										setFilterStatus('all');
										setSortBy('name-asc');
										try {
											localStorage.removeItem(STORAGE_KEY);
										} catch (e) {}
									}}>
									Clear
								</button>
							</div>
						</>
					)}
				</div>
			)}

			{/* show prior-cycle hint if viewing a non-active cycle */}
			{(() => {
				if (!bibleBeeCycles || bibleBeeCycles.length === 0) return null;
				const activeCycle = bibleBeeCycles.find((c: any) => c.is_active);
				if (!activeCycle) return null;
				const isPrior = String(activeCycle.id) !== String(selectedCycle);
				if (isPrior) {
					return (
						<div className="p-2 bg-yellow-50 border-l-4 border-yellow-300 text-sm text-yellow-800">
							Viewing prior cycle — edits disabled
						</div>
					);
				}
				return null;
			})()}

			{sorted.length === 0 ? (
				<div className="p-3 text-muted-foreground">
					{filterChildIds
						? 'No children enrolled in Bible Bee for this cycle.'
						: 'No children match the current filters.'}
				</div>
			) : (
				<div className="space-y-2">
					{sorted.map((r: any) => (
						<BibleBeeProgressCard
							key={r.childId}
							childId={r.childId}
							childName={r.childName}
							completedScriptures={r.completedScriptures}
							totalScriptures={r.totalScriptures}
							requiredScriptures={r.requiredScriptures}
							essayStatus={r.essayStatus}
							gradeGroup={r.gradeGroup}
							ministries={r.ministries}
							primaryGuardian={r.primaryGuardian}
							showGuardianInfo={showGuardianInfo}
						/>
					))}
				</div>
			)}
		</div>
	);
}
