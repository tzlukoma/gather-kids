'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBibleBeeStats } from '@/hooks/data';
import { useAttendanceForChildren } from '@/hooks/data/attendance';
import { getServiceDayIso } from '@/lib/dal';
import type { HouseholdProfileData } from '@/lib/dal';
import { cn } from '@/lib/utils';
import {
	buildBibleBeeStripLabel,
	buildChildRows,
	buildGreeting,
	buildHouseholdLine,
	buildScriptureCountLabel,
	buildScriptureProgressCopy,
	greetingSlotForHour,
	pickGreetedGuardianName,
	progressPercent,
	PRESENCE_LABEL,
} from '@/lib/guardian-home';
import type { GuardianChildRow } from '@/lib/guardian-home';
import {
	GUARDIAN_AVATAR_TILE,
	GUARDIAN_CARD,
	GUARDIAN_CARD_BODY,
	GUARDIAN_CTA,
	GUARDIAN_CHILD_META,
	GUARDIAN_CHILD_NAME,
	GUARDIAN_EYEBROW,
	GUARDIAN_GREETING,
	GUARDIAN_PILL_AWAY,
	GUARDIAN_PILL_BASE,
	GUARDIAN_PILL_DOT_ON_SITE,
	GUARDIAN_PILL_ON_SITE,
	GUARDIAN_SECONDARY_CTA,
	GUARDIAN_STRIP_COUNT,
	GUARDIAN_STRIP_LABEL,
	GUARDIAN_SUBTITLE,
} from '@/components/gatherKids/guardian-styles';

const EMPTY_CHILDREN: HouseholdProfileData['children'] = [];

/** The strip's outer frame. A rule, because it is a second subject on the card. */
function StripFrame({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
			{children}
		</div>
	);
}

/** `BIBLE BEE · JUNIOR` on the left, `9 of 20` on the right. */
function StripHeading({
	label,
	count,
}: {
	label: string;
	count: string | null;
}) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<span className={cn(GUARDIAN_STRIP_LABEL, 'min-w-0 truncate')}>
				{label}
			</span>
			{count ? (
				<span className={cn(GUARDIAN_STRIP_COUNT, 'shrink-0')}>{count}</span>
			) : null}
		</div>
	);
}

/**
 * One child's Bible Bee progress, folded into that child's card.
 *
 * A separate component because `useBibleBeeStats` is per child and hooks cannot
 * be called conditionally or in a loop — rendering this only for children the
 * row says are enrolled is what keeps the other children from firing a query
 * that would return nothing.
 *
 * Nothing here repeats the child's name: the card above it already carries it.
 */
function GuardianBibleBeeStrip({ row }: { row: GuardianChildRow }) {
	const { data, isLoading } = useBibleBeeStats(row.childId);
	const stats = data?.bbStats ?? null;
	const essaySummary = data?.essaySummary ?? null;
	const childFirstName = row.firstName || 'This child';

	if (isLoading) {
		return (
			<StripFrame>
				<StripHeading label={buildBibleBeeStripLabel(null)} count={null} />
				<p className={GUARDIAN_CARD_BODY}>Loading progress…</p>
			</StripFrame>
		);
	}

	// A division assigned an essay has no scriptures to count, so the strip shows
	// the essay state instead of a progress bar it would have to draw at zero.
	if (stats?.essayAssigned || (!stats && essaySummary)) {
		const submitted = essaySummary?.submitted ?? 0;
		const count = essaySummary?.count ?? 0;
		return (
			<StripFrame>
				<StripHeading
					label={buildBibleBeeStripLabel(stats?.division?.name)}
					count={count > 0 ? `${submitted} of ${count}` : null}
				/>
				<p className={GUARDIAN_CARD_BODY}>
					{count === 0
						? `${childFirstName}'s division is assigned an essay.`
						: `${submitted} of ${count} ${
								count === 1 ? 'essay' : 'essays'
							} submitted.`}
				</p>
				<Button asChild variant="outline" className={GUARDIAN_CTA}>
					<Link href={`/household/children/${row.childId}/bible-bee`}>
						Open assignments
					</Link>
				</Button>
			</StripFrame>
		);
	}

	// No stats means the child is enrolled in the Bible Bee ministry but has no
	// assignments in the current Bible Bee cycle yet. The strip says so rather
	// than disappearing, which would leave a guardian who signed the child up
	// looking at a card that denies it.
	const completed = stats?.completedScriptures ?? 0;
	const total = stats?.requiredScriptures ?? 0;
	const percent = progressPercent(completed, total);

	return (
		<StripFrame>
			<StripHeading
				label={buildBibleBeeStripLabel(stats?.division?.name)}
				count={buildScriptureCountLabel(completed, total)}
			/>

			{total > 0 ? (
				<div
					className="h-2 w-full overflow-hidden rounded-full bg-muted"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={total}
					aria-valuenow={Math.min(completed, total)}
					aria-label={`${childFirstName}'s scriptures memorized`}>
					<div
						className="h-full rounded-full bg-brand-aqua"
						style={{ width: `${percent}%` }}
					/>
				</div>
			) : null}

			<p className={GUARDIAN_CARD_BODY}>
				{buildScriptureProgressCopy(completed, total)}
			</p>

			{total > 0 ? (
				<Button asChild variant="outline" className={GUARDIAN_CTA}>
					<Link href={`/household/children/${row.childId}/bible-bee`}>
						Open scripture list
					</Link>
				</Button>
			) : null}
		</StripFrame>
	);
}

/**
 * One child: who they are, whether they are on site, and — if they are in Bible
 * Bee — how far along they are.
 *
 * The card is not itself a link. It holds a button, and an anchor inside an
 * anchor is neither valid nor operable: a guardian reaching for `Open scripture
 * list` would be one stray pixel away from a different page. Everything the
 * card used to link to is reached from `View full household` under the list.
 */
function GuardianChildCard({ row }: { row: GuardianChildRow }) {
	const onSite = row.presence === 'on-site';

	return (
		<Card className={GUARDIAN_CARD}>
			<CardContent className="flex flex-col gap-3.5 p-3.5">
				<div className="flex items-center gap-3.5">
					<span aria-hidden="true" className={GUARDIAN_AVATAR_TILE}>
						{row.initials}
					</span>
					<span className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className={cn(GUARDIAN_CHILD_NAME, 'truncate')}>
							{row.name}
						</span>
						{/* Two lines, not one and not unbounded: the status pill takes
						    the right of this row, so a single line cuts a child with
						    two ministries off mid-word, and no limit lets a child with
						    five push the Bible Bee strip off a phone screen. The full
						    list is on the household record either way. */}
						{row.meta ? (
							<span
								className={cn(GUARDIAN_CHILD_META, 'line-clamp-2')}
								title={row.meta}>
								{row.meta}
							</span>
						) : null}
					</span>
					<span
						className={cn(
							GUARDIAN_PILL_BASE,
							onSite ? GUARDIAN_PILL_ON_SITE : GUARDIAN_PILL_AWAY
						)}>
						{onSite ? (
							<span
								aria-hidden="true"
								className={cn(
									'h-1.5 w-1.5 rounded-full',
									GUARDIAN_PILL_DOT_ON_SITE
								)}
							/>
						) : null}
						{PRESENCE_LABEL[row.presence]}
					</span>
				</div>

				{row.inBibleBee ? <GuardianBibleBeeStrip row={row} /> : null}
			</CardContent>
		</Card>
	);
}

/**
 * GatherSystem guardian home — after Figma `Screen · Guardian / 1r home` (#371).
 *
 * A summary, not a replacement for the household record: the full profile the
 * guardian sees today is still one tap away on `/household/details`, and this
 * screen reads the same household profile it does.
 *
 * Departs from the signed frame in one structural way, at Thomas's direction:
 * the frame gives Bible Bee its own card beside the children list, so a child
 * in Bible Bee appears twice on one screen. Here each child appears once and
 * carries their own progress. What that costs is recorded on
 * `GUARDIAN_STRIP_LABEL`.
 */
export function GuardianHomeGatherSystem({
	profileData,
}: {
	profileData: HouseholdProfileData;
}) {
	const children = profileData.children ?? EMPTY_CHILDREN;
	const activeCycleId = profileData.activeCycleId ?? null;

	// `getServiceDayIso` is what check-in writes attendance under, so asking for
	// the same day is what makes "On site" agree with the door.
	const today = React.useMemo(() => getServiceDayIso(), []);
	const childIds = React.useMemo(
		() => children.map((child) => child.child_id),
		[children]
	);
	const { data: attendance } = useAttendanceForChildren(today, childIds);

	// Read at render, from the guardian's own clock. Safe against a hydration
	// mismatch because `HouseholdProtectedRoute` renders the skeleton until it
	// has resolved household access, which never happens before mount — this
	// screen is not part of the server-rendered output.
	const greetingSlot = greetingSlotForHour(new Date().getHours());

	const firstName = pickGreetedGuardianName(profileData.guardians);
	const householdLine = buildHouseholdLine(
		profileData.household?.name,
		activeCycleId ? profileData.cycleNames?.[activeCycleId] : null
	);
	const rows = buildChildRows(children, attendance, activeCycleId);

	return (
		<div className="flex flex-col gap-6">
			<header className="flex max-w-2xl flex-col gap-2">
				<p className={GUARDIAN_EYEBROW}>My household</p>
				<h1 className={GUARDIAN_GREETING}>
					{buildGreeting(greetingSlot, firstName)}
				</h1>
				{householdLine ? (
					<p className={GUARDIAN_SUBTITLE}>{householdLine}</p>
				) : null}
			</header>

			{/* One column up to `xl`, two beyond it. The cap is what keeps the
			    single column from stretching a card to the full width of a laptop,
			    where a 900px progress bar would read as a page-wide rule; past `xl`
			    there is room for two cards at that same measure. `items-start` lets
			    a child without a Bible Bee strip keep their card short rather than
			    stretching it to match the one beside it. */}
			<section className="flex min-w-0 max-w-2xl flex-col gap-3 xl:max-w-none">
				{/* The link sits in the section header, not under the list. A
				    household with five children pushes the foot of the list well
				    below the fold on a phone, and a way out of the summary that
				    only appears after you have scrolled past everything is not a
				    way out. The negative margin pulls the label flush with the
				    cards' right edge while the button keeps its hover padding, and
				    `min-h-11` gives it the same 44px target the tab bar uses — a
				    header row would otherwise shrink it to the height of its text. */}
				<div className="flex items-center justify-between gap-3">
					<h2 className={GUARDIAN_EYEBROW}>Children</h2>
					<Button
						asChild
						variant="ghost"
						className={cn(
							GUARDIAN_SECONDARY_CTA,
							'-mr-2 min-h-11 px-2 py-1'
						)}>
						<Link href="/household/details">
							View full household
							<ChevronRight aria-hidden="true" className="h-4 w-4" />
						</Link>
					</Button>
				</div>

				{rows.length === 0 ? (
					<Card className={GUARDIAN_CARD}>
						<CardContent className="p-5">
							<p className={GUARDIAN_CARD_BODY}>
								No children are registered for this cycle yet.
							</p>
						</CardContent>
					</Card>
				) : (
					<ul className="grid items-start gap-2.5 grid-cols-[minmax(0,1fr)] xl:grid-cols-[repeat(2,minmax(0,1fr))]">
						{rows.map((row) => (
							<li key={row.childId}>
								<GuardianChildCard row={row} />
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
