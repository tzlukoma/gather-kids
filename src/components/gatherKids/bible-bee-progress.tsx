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

export function LeaderBibleBeeProgress({
	cycleId,
	canUpload = false,
}: {
	cycleId: string;
	canUpload?: boolean;
}) {
	const [rows, setRows] = useState<any[] | null>(null);
	const [filterGradeGroup, setFilterGradeGroup] = useState<string | 'all'>(
		'all'
	);
	const [filterStatus, setFilterStatus] = useState<
		'all' | 'Not Started' | 'In-Progress' | 'Complete'
	>('all');
	const [availableGradeGroups, setAvailableGradeGroups] = useState<string[]>(
		[]
	);
	const competitionYears = useLiveQuery(
		() => db.competitionYears.orderBy('year').reverse().toArray(),
		[]
	);
	const [selectedCycle, setSelectedCycle] = useState<string>(cycleId);
	const [sortBy, setSortBy] = useState<
		'name-asc' | 'name-desc' | 'progress-desc' | 'progress-asc'
	>('name-asc');

	useEffect(() => {
		if (competitionYears && competitionYears.length > 0) {
			const defaultYear = String(competitionYears[0].year);
			// default to the most recent competition year
			setSelectedCycle(defaultYear);
		}
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
				setAvailableGradeGroups(Array.from(groups).sort());
				// Prefill dropdowns when data loads: ensure grade filter and sort are defaults
				setFilterGradeGroup('all');
				setSortBy('name-asc');
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, [selectedCycle]);

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
				</div>
			</div>

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
								<Link href={`/household/children/${r.childId}`}>
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
