'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import DOMPurify from 'dompurify';
import { Check, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	useBibleBeeCycles,
	useBibleBeeStats,
	useChild,
	useChildEnrollments,
	useStudentAssignmentsQuery,
	useToggleScriptureMutation,
} from '@/hooks/data';
import { toast } from '@/hooks/use-toast';
import { pickActiveBibleBeeCycle } from '@/lib/bible-bee-cycle';
import {
	ESSAY_UPLOAD_URL,
	buildCompletionLine,
	buildEssayIntro,
	buildHeadlineRest,
	buildNothingMarkedIntro,
	defaultTranslation,
	dueDateLabel,
	householdBibleBeeState,
	memorizedRows,
	normalizeEssays,
	normalizeScriptures,
	possessive,
	scriptureCounts,
	scripturesForTab,
	shortDate,
	translationOptions,
	verseFor,
	type HouseholdEssay,
	type HouseholdScripture,
	type ScriptureTab,
} from '@/lib/bible-bee-household';
import { buildBibleBeeStripLabel, progressPercent } from '@/lib/guardian-home';
import { cn } from '@/lib/utils';
import * as S from './bible-bee-household-styles';

// Formatting the scripture HTML the same way the legacy card does, with the
// same short allow-list, so a verse renders identically on both paths.
const VERSE_TAGS = ['sup', 'br', 'strong', 'em', 'p', 'ul', 'li', 'ol', 'span'];

function sanitizeVerse(html: string): string {
	try {
		return DOMPurify.sanitize(html, { ALLOWED_TAGS: VERSE_TAGS, ALLOWED_ATTR: ['class'] });
	} catch {
		return '';
	}
}

type Cycle = { id: string; name?: string | null };

/**
 * The cycle to show: the viewer's pick, then `?cycleId=`, then the child's
 * active or newest enrolled cycle — the legacy screen's order exactly, so a
 * link into either path lands on the same year.
 */
function useSelectedCycle(childId: string) {
	const searchParams = useSearchParams();
	const { data: cycles = [], isLoading: cyclesLoading } = useBibleBeeCycles();
	const { data: enrollments = [], isLoading: enrollmentsLoading } =
		useChildEnrollments(childId);
	const [picked, setPicked] = React.useState<string | null>(null);

	const enrolledCycles = React.useMemo<Cycle[]>(() => {
		const ids = new Set(
			(enrollments as Array<{ bible_bee_cycle_id?: string }>).map((e) =>
				String(e.bible_bee_cycle_id)
			)
		);
		return (cycles as Cycle[]).filter((c) => ids.has(String(c.id)));
	}, [cycles, enrollments]);

	const fallback = React.useMemo(() => {
		if (enrolledCycles.length === 0) return '';
		const cycle = pickActiveBibleBeeCycle(enrolledCycles as never[]) as Cycle | null;
		return cycle ? String(cycle.id) : '';
	}, [enrolledCycles]);

	const cycleId = picked || searchParams?.get('cycleId') || fallback;
	return {
		cycleId,
		enrolledCycles,
		setPicked,
		isLoading: cyclesLoading || enrollmentsLoading,
	};
}

export function BibleBeeHouseholdGatherSystem() {
	const params = useParams();
	const router = useRouter();
	const childId = String(params?.childId ?? '');

	const { cycleId, enrolledCycles, setPicked, isLoading: cycleLoading } =
		useSelectedCycle(childId);
	const { data: child, isLoading: childLoading, error: childError, refetch } =
		useChild(childId);
	const { data: assignments, isLoading: assignmentsLoading } =
		useStudentAssignmentsQuery(childId, cycleId);
	const { data: statsData, isLoading: statsLoading } = useBibleBeeStats(
		childId,
		cycleId
	);
	const toggle = useToggleScriptureMutation(childId, cycleId);

	const scriptures = React.useMemo(
		() => normalizeScriptures((assignments?.scriptures ?? []) as unknown[]),
		[assignments]
	);
	const essays = React.useMemo(
		() => normalizeEssays((assignments?.essays ?? []) as unknown[]),
		[assignments]
	);

	if (childError) {
		return (
			<div role="alert" className="flex flex-col items-start gap-3 py-6">
				<p className="text-body-15 text-foreground">
					We couldn&apos;t load this Bible Bee page.
				</p>
				<Button variant="outline" onClick={() => refetch()}>
					Try again
				</Button>
			</div>
		);
	}

	if (cycleLoading || childLoading || assignmentsLoading || statsLoading || !assignments) {
		return <BibleBeeHouseholdSkeleton />;
	}

	const firstName = (child as { first_name?: string } | null)?.first_name ?? null;
	const stats = statsData?.bbStats ?? null;
	const divisionName = stats?.division?.name ?? null;
	const state = householdBibleBeeState(scriptures, essays);

	const onPickCycle = (value: string) => {
		setPicked(value);
		router.replace(`?cycleId=${encodeURIComponent(value)}`, { scroll: false });
	};

	const yearPicker =
		enrolledCycles.length > 1 ? (
			<YearPicker cycles={enrolledCycles} value={cycleId} onChange={onPickCycle} />
		) : null;

	if (state === 'essay') {
		return (
			<EssayView
				firstName={firstName}
				divisionName={divisionName}
				essays={essays}
				yearPicker={yearPicker}
			/>
		);
	}

	return (
		<ScripturesView
			firstName={firstName}
			divisionName={divisionName}
			scriptures={scriptures}
			completed={stats?.completedScriptures ?? scriptureCounts(scriptures).done}
			required={stats?.requiredScriptures ?? scriptures.length}
			state={state}
			yearPicker={yearPicker}
			onToggle={(id, next) =>
				toggle.mutate(
					{ id, complete: next },
					{
						onError: () =>
							toast({
								title: 'Not saved',
								description: 'That change didn’t save. Check your connection and try again.',
								variant: 'destructive',
							}),
					}
				)
			}
		/>
	);
}

function Header({
	eyebrow,
	title,
	yearPicker,
	children,
}: {
	eyebrow: string;
	title: string;
	yearPicker: React.ReactNode;
	children?: React.ReactNode;
}) {
	return (
		<header className="flex flex-col gap-2 border-b border-border pb-4">
			<div className="flex items-center justify-between gap-3">
				<p className={S.BB_EYEBROW}>{eyebrow}</p>
				{yearPicker}
			</div>
			<h1 className={S.BB_TITLE}>{title}</h1>
			{children}
		</header>
	);
}

function YearPicker({
	cycles,
	value,
	onChange,
}: {
	cycles: Cycle[];
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger aria-label="Bible Bee year" className="h-8 w-auto gap-2 text-body-13">
				<SelectValue placeholder="Year" />
			</SelectTrigger>
			<SelectContent>
				{cycles.map((c) => (
					<SelectItem key={c.id} value={String(c.id)}>
						{c.name || String(c.id)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function ScripturesView({
	firstName,
	divisionName,
	scriptures,
	completed,
	required,
	state,
	yearPicker,
	onToggle,
}: {
	firstName: string | null;
	divisionName: string | null;
	scriptures: HouseholdScripture[];
	completed: number;
	required: number;
	state: ReturnType<typeof householdBibleBeeState>;
	yearPicker: React.ReactNode;
	onToggle: (id: string, next: boolean) => void;
}) {
	const [tab, setTab] = React.useState<ScriptureTab>('todo');
	// Cards touched since the tab was opened stay put until it changes.
	const [keep, setKeep] = React.useState<Set<string>>(() => new Set());
	const [reviewing, setReviewing] = React.useState(false);
	const [sortByDate, setSortByDate] = React.useState(true);

	const options = React.useMemo(() => translationOptions(scriptures), [scriptures]);
	const [chosenTranslation, setTranslation] = React.useState<string | null>(null);
	// A different year can carry different translations, so a choice the
	// current list does not offer falls back to the household's preference.
	const translation =
		chosenTranslation && options.includes(chosenTranslation)
			? chosenTranslation
			: defaultTranslation(scriptures, options);

	const counts = scriptureCounts(scriptures);
	const percent = progressPercent(completed, required);
	const title = `${possessive(firstName)} scriptures`;

	const chooseTab = (next: ScriptureTab) => {
		setTab(next);
		setKeep(new Set());
	};
	const toggleOne = (id: string, next: boolean) => {
		setKeep((prev) => new Set(prev).add(id));
		onToggle(id, next);
	};

	const header = (
		<Header eyebrow={buildBibleBeeStripLabel(divisionName)} title={title} yearPicker={yearPicker}>
			{state !== 'empty' ? (
				<>
					<p className="mt-1 flex items-baseline gap-2">
						<span
							className={cn(
								S.BB_FIGURE,
								state === 'all-memorized' && 'text-brand-teal'
							)}>
							{Math.min(Math.max(0, Math.floor(completed)), Math.max(0, Math.floor(required)))}
						</span>
						<span className={S.BB_FIGURE_REST}>
							{buildHeadlineRest(completed, required)}
						</span>
					</p>
					<div
						className={S.BB_PROGRESS_TRACK}
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={percent}
						aria-label={`${possessive(firstName)} scriptures memorized`}>
						<div className={S.BB_PROGRESS_FILL} style={{ width: `${percent}%` }} />
					</div>
				</>
			) : null}
		</Header>
	);

	if (state === 'empty') {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<p className="text-body-15 text-muted-foreground">No scriptures assigned yet.</p>
			</div>
		);
	}

	if (state === 'all-memorized' && !reviewing) {
		const rows = memorizedRows(scriptures, sortByDate);
		return (
			<div className="flex flex-col gap-5">
				{header}
				<section className={S.BB_CELEBRATION} aria-labelledby="bb-complete-title">
					<span className="flex size-13 items-center justify-center rounded-full bg-card text-brand-teal">
						<Check className="size-6" aria-hidden="true" />
					</span>
					<h2 id="bb-complete-title" className={S.BB_CELEBRATION_TITLE}>
						Every scripture memorized
					</h2>
					<p className={S.BB_CELEBRATION_BODY}>
						{buildCompletionLine(firstName, divisionName, scriptures)}
					</p>
				</section>
				<section className="flex flex-col gap-2" aria-labelledby="bb-memorized-title">
					<div className="flex items-center justify-between gap-3">
						<h2 id="bb-memorized-title" className={S.BB_EYEBROW}>
							Memorized · {counts.done}
						</h2>
						<button
							type="button"
							className={S.BB_TEXT_ACTION}
							aria-pressed={sortByDate}
							onClick={() => setSortByDate((v) => !v)}>
							Sort by date
						</button>
					</div>
					<ul>
						{rows.map((s) => (
							<li key={s.id} className={S.BB_ROW}>
								<span className="size-[18px] shrink-0 rounded-full bg-brand-aqua" aria-hidden="true" />
								<span className={S.BB_ROW_LABEL}>
									{s.number} · {s.reference}
								</span>
								<span className={S.BB_ROW_DATE}>{shortDate(s.completedAt) ?? ''}</span>
							</li>
						))}
					</ul>
					<button
						type="button"
						className={cn(S.BB_TEXT_ACTION, 'self-start py-2')}
						onClick={() => {
							setReviewing(true);
							chooseTab('all');
						}}>
						Review all {counts.all} verses
					</button>
				</section>
			</div>
		);
	}

	// `1t`: nothing is marked yet, so there is nothing to split into tabs —
	// the frame drops them and leads with the intro instead.
	const showTabs = state !== 'nothing-marked';
	const visible = showTabs ? scripturesForTab(scriptures, tab, keep) : scriptures;

	return (
		<div className="flex flex-col gap-4">
			{header}

			{!showTabs ? (
				<p className={S.BB_NOTE}>{buildNothingMarkedIntro(firstName, counts.all)}</p>
			) : null}

			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				{showTabs ? (
				<div className={S.BB_SEGMENTED} role="group" aria-label="Which scriptures to show">
					<SegmentButton active={tab === 'todo'} onClick={() => chooseTab('todo')}>
						To memorize {counts.todo}
					</SegmentButton>
					<SegmentButton active={tab === 'done'} onClick={() => chooseTab('done')}>
						Memorized {counts.done}
					</SegmentButton>
					<SegmentButton active={tab === 'all'} onClick={() => chooseTab('all')}>
						All {counts.all}
					</SegmentButton>
				</div>
				) : null}
				{options.length > 1 ? (
					<div className="flex gap-2" role="group" aria-label="Translation">
						{options.map((code) => (
							<button
								key={code}
								type="button"
								aria-pressed={translation === code}
								onClick={() => setTranslation(code)}
								className={cn(
									S.BB_TRANSLATION_CHIP,
									translation === code ? S.BB_TRANSLATION_CHIP_ON : S.BB_TRANSLATION_CHIP_OFF
								)}>
								{code}
							</button>
						))}
					</div>
				) : null}
			</div>

			{visible.length === 0 ? (
				<p className="py-6 text-center text-body-15 text-muted-foreground">
					{tab === 'done'
						? 'Nothing marked memorized yet.'
						: 'Every scripture here is memorized.'}
				</p>
			) : (
				<ul className="grid gap-3 lg:grid-cols-2">
					{visible.map((s) => (
						<li key={s.id}>
							<ScriptureCard
								scripture={s}
								translation={translation}
								onToggle={(next) => toggleOne(s.id, next)}
							/>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function SegmentButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={cn(S.BB_SEGMENT, active && S.BB_SEGMENT_ACTIVE)}>
			{children}
		</button>
	);
}

function ScriptureCard({
	scripture,
	translation,
	onToggle,
}: {
	scripture: HouseholdScripture;
	translation: string | null;
	onToggle: (next: boolean) => void;
}) {
	const verse = verseFor(scripture, translation);
	const html = React.useMemo(() => sanitizeVerse(verse.text), [verse.text]);
	const done = scripture.completed;
	return (
		<article className={cn(S.BB_CARD, 'h-full')}>
			<div className={cn('flex items-start gap-3 px-3.5 py-3', done && S.BB_CARD_HEAD_DONE)}>
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<h3 className={S.BB_CARD_TITLE}>{scripture.reference}</h3>
					<div className="flex gap-1.5">
						<span className={S.BB_META_CHIP}>#{scripture.number}</span>
						<span className={S.BB_META_CHIP}>{verse.translation}</span>
					</div>
				</div>
				<button
					type="button"
					aria-pressed={done}
					aria-label={
						done
							? `${scripture.reference} is memorized. Mark as not memorized`
							: `Mark ${scripture.reference} memorized`
					}
					onClick={() => onToggle(!done)}
					className={cn(S.BB_CHECK, done ? S.BB_CHECK_ON : S.BB_CHECK_OFF)}>
					<Check className="size-4" aria-hidden="true" />
				</button>
			</div>
			{html ? (
				<div
					className={cn(S.BB_VERSE, 'px-3.5 pb-4', done ? 'pt-3' : 'pt-0')}
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			) : (
				<p className="px-3.5 pb-4 text-body-14 text-muted-foreground">
					Verse text isn&apos;t available yet.
				</p>
			)}
		</article>
	);
}

function EssayView({
	firstName,
	divisionName,
	essays,
	yearPicker,
}: {
	firstName: string | null;
	divisionName: string | null;
	essays: HouseholdEssay[];
	yearPicker: React.ReactNode;
}) {
	const open = essays.filter((e) => !e.submitted);
	const handedIn = essays.filter((e) => e.submitted);
	return (
		<div className="flex flex-col gap-4">
			<Header
				eyebrow={buildBibleBeeStripLabel(divisionName)}
				title={`${possessive(firstName)} assignments`}
				yearPicker={yearPicker}>
				<p className={S.BB_INTRO}>{buildEssayIntro(divisionName)}</p>
			</Header>
			<section className="flex max-w-2xl flex-col gap-3" aria-labelledby="bb-essays-title">
				<h2 id="bb-essays-title" className={S.BB_EYEBROW}>
					Essays
				</h2>
				{open.map((e) => (
					<article key={e.id} className={S.BB_CARD}>
						<div className="flex items-start gap-3 border-b border-border px-4 py-3.5">
							<div className="flex min-w-0 flex-1 flex-col gap-2">
								<h3 className={S.BB_CARD_TITLE}>{e.title}</h3>
								{dueDateLabel(e.dueDate) ? (
									<div className="flex gap-1.5">
										<span className={S.BB_META_CHIP}>Due {dueDateLabel(e.dueDate)}</span>
									</div>
								) : null}
							</div>
							<span className={cn(S.BB_PILL, S.BB_PILL_ASSIGNED)}>Assigned</span>
						</div>
						<div className="flex flex-col gap-3.5 px-4 pb-4 pt-3.5">
							{e.prompt ? (
								<p className="whitespace-pre-line text-body-15 text-foreground">{e.prompt}</p>
							) : null}
							<Button asChild className={S.BB_PRIMARY_CTA}>
								<a href={ESSAY_UPLOAD_URL} target="_blank" rel="noopener noreferrer">
									<Upload className="size-4" aria-hidden="true" />
									Upload Essay
									<span className="sr-only"> (opens in a new tab)</span>
								</a>
							</Button>
						</div>
					</article>
				))}
				{handedIn.map((e) => (
					<article key={e.id} className={S.BB_SUBMITTED_CARD}>
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<h3 className={cn(S.BB_SUBMITTED_TITLE, 'truncate')}>{e.title}</h3>
							{shortDate(e.submittedAt) ? (
								<p className="text-body-13 text-muted-foreground">
									Submitted {shortDate(e.submittedAt)}
								</p>
							) : null}
						</div>
						<span className={cn(S.BB_PILL, S.BB_PILL_SUBMITTED)}>
							<span className="size-1.5 rounded-full bg-brand-aqua" aria-hidden="true" />
							Submitted
						</span>
					</article>
				))}
			</section>
		</div>
	);
}

function BibleBeeHouseholdSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading Bible Bee">
			<Skeleton className="h-3 w-32" />
			<Skeleton className="h-8 w-56" />
			<Skeleton className="h-2 w-full" />
			<Skeleton className="h-9 w-full md:w-80" />
			<div className="grid gap-3 lg:grid-cols-2">
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-40 w-full" />
			</div>
		</div>
	);
}
