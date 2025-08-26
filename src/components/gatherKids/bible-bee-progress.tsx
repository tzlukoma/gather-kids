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
import {
	getLeaderBibleBeeProgress,
	getBibleBeeProgressForCycle,
} from '@/lib/dal';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';

export function LeaderBibleBeeProgress({
	cycleId,
	canUpload = false,
}: {
	cycleId: string;
	canUpload?: boolean;
}) {
	const STORAGE_KEY = 'bb_progress_filters_v1';
	const [rows, setRows] = useState<any[] | null>(null);
	const [availableGradeGroups, setAvailableGradeGroups] = useState<string[]>(
		[]
	);
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
		initial?.selectedCycle ?? cycleId
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

	const { userRole } = useAuth();

	useEffect(() => {
		if (competitionYears && competitionYears.length > 0) {
			const defaultYear = String(competitionYears[0].year);
			// default to the most recent competition year only if not set by storage
			if (!initial?.selectedCycle || initial?.selectedCycle === cycleId) {
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
				setRows(res);
				const groups = new Set<string>();
				res.forEach((r: any) => {
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
	}, [selectedCycle]);

	// persist filter state so switching tabs (which may unmount) preserves selections
	useEffect(() => {
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
	}, [selectedCycle, filterGradeGroup, filterStatus, sortBy]);

	if (!rows) return <div>Loading Bible Bee progress...</div>;

	const filtered = rows.filter((r: any) => {
		if (filterGradeGroup !== 'all') {
			if (r.gradeGroup !== filterGradeGroup) return false;
		}
		if (filterStatus !== 'all') return r.bibleBeeStatus === filterStatus;
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
		<div className="space-y-2">
			<div className="flex items-center gap-4 mb-2">
				<div className="w-48">
					<Select
						value={selectedCycle}
						onValueChange={(v: any) => setSelectedCycle(String(v))}>
						<SelectTrigger>
							<SelectValue>{selectedCycle || cycleId}</SelectValue>
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
			</div>

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
					No children enrolled in Bible Bee for this cycle.
				</div>
			) : (
				sorted.map((r: any) => (
					<div
						key={r.childId}
						className="p-3 border rounded-md flex items-center justify-between">
						<div>
							<div className="font-medium">
								{/**
								 * Guardians should go to the household child profile.
								 * Leaders, volunteers, admins should go to the Bible Bee assignments page
								 * to avoid the guardian-only authorization check in the household profile page.
								 */}
								<Link
									href={
										userRole === AuthRole.GUARDIAN
											? `/household/children/${r.childId}`
											: `/dashboard/bible-bee/child/${r.childId}`
									}>
									{r.childName}
								</Link>
							</div>
							<div className="text-sm text-muted-foreground">
								Scriptures: {r.completedScriptures}/{r.totalScriptures} — Essay:{' '}
								{r.essayStatus}
							</div>
							<div className="text-xs text-muted-foreground">
								Grade Group: {r.gradeGroup || 'N/A'} — Ministries:{' '}
								{(r.ministries || [])
									.map((m: any) => m.ministryName)
									.join(', ')}
							</div>
						</div>
						<div className="text-sm text-muted-foreground">
							{Math.round(r.progressPct)}%
						</div>
					</div>
				))
			)}
		</div>
	);
}

export default LeaderBibleBeeProgress;
