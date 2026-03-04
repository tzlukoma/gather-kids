'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, Printer } from 'lucide-react';
import { useBibleBeeCycles, useScripturesForCycle } from '@/hooks/data';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ROLES } from '@/lib/constants/roles';
import { DefaultLoadingSpinner } from '@/components/ui/spinner';
import type { Scripture } from '@/lib/types';

// Translation display order and colors matching the evaluation sheet design
const TRANSLATION_CONFIG: { key: string; label: string; bgColor: string; textColor: string }[] = [
	{ key: 'NLT', label: 'NLT', bgColor: 'bg-red-600', textColor: 'text-white' },
	{ key: 'NIV', label: 'NIV', bgColor: 'bg-blue-600', textColor: 'text-white' },
	{ key: 'KJV', label: 'KJV', bgColor: 'bg-green-700', textColor: 'text-white' },
	{ key: 'NIV-ES', label: 'NIV-ES', bgColor: 'bg-slate-600', textColor: 'text-white' },
	{ key: 'NVI', label: 'NVI', bgColor: 'bg-amber-700', textColor: 'text-white' },
];

function EvaluationScripturesContent() {
	const searchParams = useSearchParams();
	const cycleFromUrl = searchParams.get('cycle');
	const [selectedCycle, setSelectedCycle] = useState<string | null>(cycleFromUrl);

	const { data: bibleBeeCycles = [], isLoading: cyclesLoading } = useBibleBeeCycles();

	// Sync URL param to local state when cycles load
	useEffect(() => {
		if (cycleFromUrl && bibleBeeCycles.some((c: { id: string }) => c.id === cycleFromUrl)) {
			setSelectedCycle(cycleFromUrl);
		}
	}, [cycleFromUrl, bibleBeeCycles]);

	const defaultCycle = useMemo(() => {
		if (!bibleBeeCycles?.length) return null;
		const active = bibleBeeCycles.find((c: { is_active?: boolean }) => c.is_active);
		if (active) return String(active.id);
		const sorted = [...bibleBeeCycles].sort((a: { name?: string }, b: { name?: string }) =>
			(b.name || '').localeCompare(a.name || '')
		);
		return sorted.length ? String(sorted[sorted.length - 1].id) : null;
	}, [bibleBeeCycles]);

	const effectiveCycle =
		(cycleFromUrl && bibleBeeCycles.some((c: { id: string }) => c.id === cycleFromUrl)
			? cycleFromUrl
			: null) ?? selectedCycle ?? defaultCycle ?? '';

	const { data: scriptures = [], isLoading: scripturesLoading } =
		useScripturesForCycle(effectiveCycle);

	const cycleLabel = useMemo(() => {
		const cycle = bibleBeeCycles.find((c: { id: string }) => c.id === effectiveCycle);
		return cycle?.name ?? 'Bible Bee';
	}, [bibleBeeCycles, effectiveCycle]);

	// Collect all translation keys from scriptures (for any extras not in config)
	const allTranslationKeys = useMemo(() => {
		const keys = new Set<string>(TRANSLATION_CONFIG.map((t) => t.key));
		for (const s of scriptures) {
			if (s.texts) Object.keys(s.texts).forEach((k) => keys.add(k));
		}
		return Array.from(keys);
	}, [scriptures]);

	// Selected translations to display (default: all available)
	const [selectedTranslations, setSelectedTranslations] = useState<Set<string>>(new Set());

	// When scriptures/translations load, default to all selected
	useEffect(() => {
		if (allTranslationKeys.length > 0) {
			setSelectedTranslations(new Set(allTranslationKeys));
		}
	}, [allTranslationKeys.join(',')]);

	const toggleTranslation = (key: string) => {
		setSelectedTranslations((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const handleSelectAll = () => setSelectedTranslations(new Set(allTranslationKeys));
	const handleSelectNone = () => setSelectedTranslations(new Set());

	const handlePrint = () => window.print();

	if (cyclesLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<DefaultLoadingSpinner />
			</div>
		);
	}

	if (!bibleBeeCycles?.length) {
		return (
			<div className="mx-auto max-w-4xl p-6">
				<p className="text-muted-foreground">No Bible Bee cycles found. Add cycles in the Bible Bee management area.</p>
				<Link href="/dashboard/bible-bee">
					<Button variant="link" className="mt-2">
						Go to Bible Bee
					</Button>
				</Link>
			</div>
		);
	}

	const sortedScriptures = [...scriptures].sort(
		(a: Scripture, b: Scripture) => (a.scripture_order ?? 0) - (b.scripture_order ?? 0)
	);

	return (
		<div className="mx-auto max-w-4xl p-6 print:bg-white print:p-4">
			{/* Controls - hidden when printing */}
			<div className="mb-6 flex flex-col gap-4 print:hidden">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-4">
						<Link href="/dashboard/bible-bee">
							<Button variant="ghost" size="icon">
								<ChevronLeft className="h-4 w-4" />
							</Button>
						</Link>
						<div className="flex items-center gap-2">
							<label htmlFor="cycle-select" className="text-sm font-medium">
								Cycle:
							</label>
							<Select value={effectiveCycle} onValueChange={setSelectedCycle}>
								<SelectTrigger id="cycle-select" className="w-[220px]">
									<SelectValue placeholder="Select cycle" />
								</SelectTrigger>
								<SelectContent>
									{bibleBeeCycles.map((cycle: { id: string; name: string }) => (
										<SelectItem key={cycle.id} value={cycle.id}>
											{cycle.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<Button onClick={handlePrint}>
						<Printer className="mr-2 h-4 w-4" />
						Print
					</Button>
				</div>
				{allTranslationKeys.length > 0 && (
					<div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
						<span className="text-sm font-medium">Translations:</span>
						<div className="flex flex-wrap items-center gap-4">
							{allTranslationKeys.map((key) => {
								const config = TRANSLATION_CONFIG.find((t) => t.key === key);
								const label = config?.label ?? key;
								return (
									<label
										key={key}
										className="flex cursor-pointer items-center gap-2 text-sm"
									>
										<Checkbox
											checked={selectedTranslations.has(key)}
											onCheckedChange={() => toggleTranslation(key)}
										/>
										<span>{label}</span>
									</label>
								);
							})}
						</div>
						<div className="flex gap-2">
							<Button variant="ghost" size="sm" onClick={handleSelectAll}>
								All
							</Button>
							<Button variant="ghost" size="sm" onClick={handleSelectNone}>
								None
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Printable content */}
			<div className="space-y-8">
				<h1 className="text-center text-2xl font-bold print:text-3xl">
					{cycleLabel}
				</h1>
				<p className="text-center text-sm text-muted-foreground print:text-base">
					Evaluation Scripture Reference Sheet
				</p>

				{scripturesLoading ? (
					<div className="flex justify-center py-12">
						<DefaultLoadingSpinner />
					</div>
				) : sortedScriptures.length === 0 ? (
					<p className="text-center text-muted-foreground">
						No scriptures found for this cycle.
					</p>
				) : selectedTranslations.size === 0 ? (
					<p className="text-center text-muted-foreground print:hidden">
						No translations selected. Select at least one translation above.
					</p>
				) : (
					<div className="space-y-8">
						{sortedScriptures.map((scripture) => (
							<ScriptureBlock
								key={scripture.id}
								scripture={scripture}
								translationKeys={allTranslationKeys}
								selectedTranslations={selectedTranslations}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function ScriptureBlock({
	scripture,
	translationKeys,
	selectedTranslations,
}: {
	scripture: Scripture;
	translationKeys: string[];
	selectedTranslations: Set<string>;
}) {
	const title = scripture.scripture_number
		? `${scripture.scripture_number}. ${scripture.reference}`
		: scripture.reference;

	const texts = (scripture.texts ?? {}) as Record<string, string>;

	// Show only selected translations, in config order first, then any extras alphabetically
	const orderedKeys = [
		...TRANSLATION_CONFIG.filter(
			(t) => translationKeys.includes(t.key) && selectedTranslations.has(t.key)
		).map((t) => t.key),
		...translationKeys
			.filter(
				(k) =>
					!TRANSLATION_CONFIG.some((t) => t.key === k) && selectedTranslations.has(k)
			)
			.sort(),
	];

	return (
		<div className="break-inside-avoid rounded-lg border border-border bg-card p-4 shadow-sm">
			<h2 className="mb-4 font-semibold text-foreground">{title}</h2>
			<div className="space-y-2">
				{orderedKeys.map((key) => {
					const config = TRANSLATION_CONFIG.find((t) => t.key === key);
					const text = texts[key] ?? '';
					const label = config?.label ?? key;
					const bgColor = config?.bgColor ?? 'bg-slate-600';
					const textColor = config?.textColor ?? 'text-white';

					return (
						<div key={key} className="flex overflow-hidden rounded border border-border">
							<div
								className={`flex w-16 shrink-0 items-center justify-center px-2 py-2 font-medium ${bgColor} ${textColor}`}
							>
								{label}
							</div>
							<div className="min-w-0 flex-1 bg-background p-3 text-sm leading-relaxed font-scripture">
								{text ? (
									<span
										dangerouslySetInnerHTML={{
											__html: text.replace(/<sup>/g, '<sup class="align-super text-xs">'),
										}}
									/>
								) : (
									<span className="text-muted-foreground italic">—</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default function EvaluationScripturesPage() {
	return (
		<ProtectedRoute
			allowedRoles={[ROLES.ADMIN, ROLES.MINISTRY_LEADER]}
			loadingComponent={<DefaultLoadingSpinner />}
		>
			<EvaluationScripturesContent />
		</ProtectedRoute>
	);
}
