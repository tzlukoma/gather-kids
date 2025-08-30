'use client';

import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
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
}

export function BibleBeeProgressList({
	initialCycle,
	filterChildIds,
	showGuardianInfo = true,
	showFilters = true,
	title,
	description,
	showYearSelection = true
}: BibleBeeProgressListProps) {
	const STORAGE_KEY = 'bb_progress_filters_v1';
	const [rows, setRows] = useState<any[] | null>(null);
	const [availableGradeGroups, setAvailableGradeGroups] = useState<string[]>([]);
	const competitionYears = useLiveQuery(
		() => db.competitionYears.orderBy('year').reverse().toArray(),
		[]
	);

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
		if (competitionYears && competitionYears.length > 0) {
			const defaultYear = String(competitionYears[0].year);
			// default to the most recent competition year only if not set by storage
			if (!initial?.selectedCycle && !initialCycle) {
				setSelectedCycle(defaultYear);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [competitionYears]);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			const res = await getBibleBeeProgressForCycle(selectedCycle);
			if (mounted) {
				// Filter to specific children if provided
				const filteredRes = filterChildIds 
					? res.filter((r: any) => filterChildIds.includes(r.childId))
					: res;

				// Prefetch guardians for rows' households to ensure primary guardian is available
				const householdIds = Array.from(
					new Set(filteredRes.map((r: any) => r.child?.household_id).filter(Boolean))
				);
				let guardianMap = new Map<string, any>();
				if (householdIds.length > 0) {
					const guardians = await db.guardians
						.where('household_id')
						.anyOf(householdIds)
						.toArray();
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
	}, [selectedCycle, filterChildIds]);

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
		const denom = r.requiredScriptures || r.totalScriptures || 1;
		const pct = denom === 0 ? 0 : (r.completedScriptures / denom) * 100;
		return { ...r, progressPct: pct };
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
					)}

					{showFilters && (
						<>
							<div className="w-56">
								<Select
									value={filterGradeGroup}
									onValueChange={(v: any) => setFilterGradeGroup(v as any)}>
									<SelectTrigger>
										<SelectValue>
											{filterGradeGroup === 'all'
												? 'All Grade Groups'
												: filterGradeGroup}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={'all'}>All Grade Groups</SelectItem>
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
									onValueChange={(v: any) => setSortBy(v as any)}>
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
										if (competitionYears && competitionYears.length > 0)
											setSelectedCycle(String(competitionYears[0].year));
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

			{/* show prior-year hint if viewing a non-latest year */}
			{competitionYears &&
				competitionYears.length > 0 &&
				String(competitionYears[0].year) !== String(selectedCycle) && (
					<div className="p-2 bg-yellow-50 border-l-4 border-yellow-300 text-sm text-yellow-800">
						Viewing prior year — edits disabled
					</div>
				)}

			{sorted.length === 0 ? (
				<div className="p-3 text-muted-foreground">
					{filterChildIds 
						? "No children enrolled in Bible Bee for this cycle."
						: "No children match the current filters."
					}
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