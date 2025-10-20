'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getAllGuardians } from '@/lib/dal';
import {
	useBibleBeeCyclesQuery,
	useBibleBeeProgressQuery,
} from '@/lib/hooks/useBibleBee';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/select';
import { BibleBeeProgressCard } from './bible-bee-progress-card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { normalizeGradeDisplay } from '@/lib/gradeUtils';

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
	showYearSelection = true,
}: BibleBeeProgressListProps) {
	// Helpers
	function isActiveValue(v: unknown): boolean {
		return v === true || v === 1 || String(v) === '1' || String(v) === 'true';
	}
	function getValue(v: unknown): string {
		return typeof v === 'string' ? v : String(v ?? '');
	}

	const STORAGE_KEY = 'bb_progress_filters_v1';

	// Use React Query for Bible Bee cycles data (no need for props in React Query pattern)
	const {
		data: bibleBeeCycles = [],
		isLoading: cyclesLoading,
		error: cyclesError,
	} = useBibleBeeCyclesQuery();

	// Initialize filters from localStorage when possible so tab switches keep state
	const initial = useMemo(() => {
		try {
			if (typeof localStorage === 'undefined') return null;
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			return JSON.parse(raw);
		} catch (e) {
			return null;
		}
	}, []); // Empty dependency array - only run once on mount

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

	// Derive default cycle from data instead of using useEffect
	const getDefaultCycle = useMemo(() => {
		if (!bibleBeeCycles || bibleBeeCycles.length === 0) return null;
		
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
			return String(active.id);
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

		return String(sortedCycles[0].id);
	}, [bibleBeeCycles]);

	// Use derived state instead of useState + useEffect
	const effectiveSelectedCycle = useMemo(() => {
		// Priority: explicit prop > localStorage > computed default > fallback
		return initialCycle ?? initial?.selectedCycle ?? getDefaultCycle ?? '2025';
	}, [initialCycle, initial?.selectedCycle, getDefaultCycle]);

	// Only use state for user-initiated changes
	const [userSelectedCycle, setUserSelectedCycle] = useState<string | null>(null);
	
	// The actual selected cycle is either user-selected or derived
	const selectedCycle = userSelectedCycle ?? effectiveSelectedCycle;

	// Use React Query for progress data
	const {
		data: progressData = [],
		isLoading: progressLoading,
		error: progressError,
	} = useBibleBeeProgressQuery(selectedCycle, filterChildIds);

	// Derive grade groups from progress data (React Query pattern)
	const availableGradeGroups = useMemo(() => {
		if (!progressData || progressData.length === 0) {
			return [];
		}

		const groups = new Set<string>();
		progressData.forEach((r: any) => {
			if (r.gradeGroup) groups.add(r.gradeGroup);
		});
		return Array.from(groups).sort();
	}, [progressData]);

	// Reset grade group filter if it no longer exists
	useEffect(() => {
		if (
			filterGradeGroup !== 'all' &&
			availableGradeGroups.length > 0 &&
			!availableGradeGroups.includes(filterGradeGroup)
		) {
			setFilterGradeGroup('all');
		}
	}, [availableGradeGroups, filterGradeGroup]);

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

	// Show loading state
	if (progressLoading) {
		return <div>Loading Bible Bee progress...</div>;
	}

	// Show error state
	if (progressError) {
		return <div>Error loading Bible Bee progress: {progressError.message}</div>;
	}

	const filtered = progressData.filter((r: any) => {
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

	// Export functionality
	const exportToCSV = () => {
		if (!sorted || sorted.length === 0) return;

		const headers = [
			'Name',
			'Grade',
			'Division',
			'Guardian',
			'Guardian Phone',
			'Progress',
		];
		const csvContent = [
			headers.join(','),
			...sorted.map((row: any) => {
				const name = `"${row.childName}"`;
				const grade = `"${normalizeGradeDisplay(row.child?.grade) || ''}"`;
				const division = `"${row.gradeGroup || ''}"`;
				const guardian = `"${
					row.primaryGuardian
						? `${row.primaryGuardian.first_name} ${row.primaryGuardian.last_name}`
						: ''
				}"`;
				const guardianPhone = `"${row.primaryGuardian?.mobile_phone || ''}"`;

				// Progress format: "x / y" for scriptures or "Essay Assigned" / "Essay Submitted" for essays
				// Use single quotes to prevent Excel from interpreting as dates
				let progress = '';
				if (row.essayStatus) {
					// Essay track - binary status
					progress = `"${row.essayStatus}"`;
				} else {
					// Scripture track - format as "x of y" to avoid date interpretation
					const completed = row.completedScriptures || 0;
					const required = row.requiredScriptures || row.totalScriptures || 0;
					progress = `"${completed} of ${required}"`;
				}

				return [name, grade, division, guardian, guardianPhone, progress].join(
					','
				);
			}),
		].join('\n');

		// Create and download the file
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);

		// Generate filename with current date and cycle name
		const cycleName = displayCycleLabel || selectedCycle;
		const date = new Date().toISOString().split('T')[0];
		link.setAttribute(
			'download',
			`bible-bee-students-${cycleName}-${date}.csv`
		);

		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

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
								onValueChange={(v: any) => setUserSelectedCycle(String(v))}>
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
							</div>

							{/* Export button */}
							<Button
								variant="outline"
								size="sm"
								onClick={exportToCSV}
								disabled={!sorted || sorted.length === 0}
								className="flex items-center gap-2">
								<Download className="h-4 w-4" />
								Export CSV
							</Button>

							<div className="flex-1" />
							<button
								className="px-2 py-1 border rounded"
								onClick={() => {
									// reset to defaults
									if (bibleBeeCycles && bibleBeeCycles.length > 0) {
										// Use active cycle if available, otherwise most recent
										const active = bibleBeeCycles.find((c: any) => c.is_active);
										const defaultCycle = active
											? active.id
											: bibleBeeCycles[0].id;
										setUserSelectedCycle(String(defaultCycle));
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
