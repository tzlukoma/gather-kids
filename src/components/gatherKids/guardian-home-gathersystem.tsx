'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBibleBeeStats } from '@/hooks/data';
import { useAttendanceForChildren } from '@/hooks/data/attendance';
import { getServiceDayIso } from '@/lib/dal';
import type { HouseholdProfileData } from '@/lib/dal';
import { cn } from '@/lib/utils';
import {
	buildChildRows,
	buildGreeting,
	buildHouseholdLine,
	buildScriptureProgressCopy,
	greetingSlotForHour,
	pickGreetedGuardianName,
	progressPercent,
	PRESENCE_LABEL,
} from '@/lib/guardian-home';
import {
	GUARDIAN_AVATAR_TILE,
	GUARDIAN_CARD,
	GUARDIAN_CARD_BODY,
	GUARDIAN_CARD_NOTE,
	GUARDIAN_CARD_TITLE,
	GUARDIAN_CTA,
	GUARDIAN_CHILD_META,
	GUARDIAN_CHILD_NAME,
	GUARDIAN_EYEBROW,
	GUARDIAN_GREETING,
	GUARDIAN_METRIC,
	GUARDIAN_METRIC_UNIT,
	GUARDIAN_PILL_AWAY,
	GUARDIAN_PILL_BASE,
	GUARDIAN_PILL_DOT_ON_SITE,
	GUARDIAN_PILL_ON_SITE,
	GUARDIAN_SUBTITLE,
} from '@/components/gatherKids/guardian-styles';

type ProfileChild = HouseholdProfileData['children'][number];

const EMPTY_CHILDREN: ProfileChild[] = [];

/** Children in this household enrolled in Bible Bee for the active cycle. */
function bibleBeeChildren(
	children: ProfileChild[],
	activeCycleId: string | null | undefined
): ProfileChild[] {
	return children.filter((child) => {
		const byCycle = child.enrollmentsByCycle ?? {};
		const enrollments = activeCycleId
			? (byCycle[activeCycleId] ?? [])
			: Object.values(byCycle).flat();
		return enrollments.some(
			(enrollment) =>
				(enrollment as { ministry_code?: string }).ministry_code === 'bible-bee'
		);
	});
}

/**
 * The Bible Bee summary for one child.
 *
 * A component rather than a loop inside the home screen because the stats hook
 * is per child and hooks cannot be called in a loop. One card per enrolled
 * child: the signed frame draws a household with a single Bible Bee child, and
 * collapsing two children into one card would have to pick which of them the
 * number belongs to.
 */
function GuardianBibleBeeCard({ child }: { child: ProfileChild }) {
	const { data, isLoading } = useBibleBeeStats(child.child_id);
	const stats = data?.bbStats ?? null;
	const essaySummary = data?.essaySummary ?? null;

	const childFirstName = (child.first_name ?? '').trim() || 'This child';
	const divisionName = stats?.division?.name;

	if (isLoading) {
		return (
			<Card className={GUARDIAN_CARD}>
				<CardContent className="p-5">
					<p className={GUARDIAN_CARD_BODY}>Loading Bible Bee progress…</p>
				</CardContent>
			</Card>
		);
	}

	// A division assigned an essay has no scriptures to count, so the card shows
	// the essay state instead of a progress bar it would have to draw at zero.
	if (stats?.essayAssigned || (!stats && essaySummary)) {
		const submitted = essaySummary?.submitted ?? 0;
		const count = essaySummary?.count ?? 0;
		return (
			<Card className={GUARDIAN_CARD}>
				<CardContent className="flex flex-col gap-3 p-5">
					<div className="flex items-baseline gap-3">
						<h2 className={cn(GUARDIAN_CARD_TITLE, 'flex-1')}>Bible Bee</h2>
						{divisionName ? (
							<span className={GUARDIAN_CARD_NOTE}>
								{childFirstName} · {divisionName}
							</span>
						) : null}
					</div>
					<p className={GUARDIAN_CARD_BODY}>
						{count === 0
							? `${childFirstName}'s division is assigned an essay.`
							: `${submitted} of ${count} ${
									count === 1 ? 'essay' : 'essays'
								} submitted.`}
					</p>
					<Button asChild variant="outline" className={GUARDIAN_CTA}>
						<Link href={`/household/children/${child.child_id}/bible-bee`}>
							Open assignments
						</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (!stats) return null;

	const completed = stats.completedScriptures ?? 0;
	const total = stats.requiredScriptures ?? 0;
	const percent = progressPercent(completed, total);

	return (
		<Card className={GUARDIAN_CARD}>
			<CardContent className="flex flex-col gap-3 p-5">
				<div className="flex items-baseline gap-3">
					<h2 className={cn(GUARDIAN_CARD_TITLE, 'flex-1')}>Bible Bee</h2>
					{divisionName ? (
						<span className={GUARDIAN_CARD_NOTE}>
							{childFirstName} · {divisionName}
						</span>
					) : null}
				</div>

				<p className="flex items-baseline gap-2">
					<span className={GUARDIAN_METRIC}>{completed}</span>
					<span className={GUARDIAN_METRIC_UNIT}>
						of {total} scriptures memorized
					</span>
				</p>

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

				<p className={GUARDIAN_CARD_BODY}>
					{buildScriptureProgressCopy(completed, total)}
				</p>

				<Button asChild variant="outline" className={GUARDIAN_CTA}>
					<Link href={`/household/children/${child.child_id}/bible-bee`}>
						Open scripture list
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}

/**
 * GatherSystem guardian home — Figma `Screen · Guardian / 1r home` (#371).
 *
 * A summary, not a replacement for the household record: the full profile the
 * guardian sees today is still one tap away on `/household/details`, and this
 * screen reads the same household profile it does.
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
	const beeChildren = bibleBeeChildren(children, activeCycleId);

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-2">
				<p className={GUARDIAN_EYEBROW}>My household</p>
				<h1 className={GUARDIAN_GREETING}>
					{buildGreeting(greetingSlot, firstName)}
				</h1>
				{householdLine ? (
					<p className={GUARDIAN_SUBTITLE}>{householdLine}</p>
				) : null}
			</header>

			{/* `minmax(0,...)` on every track, not just the `lg` one: a grid item's
			    default `min-width: auto` lets the truncated child rows below size
			    the column to their un-wrapped max-content, which runs the whole
			    page off the right of a phone. */}
			<div className="grid gap-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_22rem]">
				{/* Bible Bee first on a phone, where it is the reason to open the
				    app; alongside the children list from `lg` up, as in `36:2`. */}
				{beeChildren.length > 0 ? (
					<div className="flex min-w-0 flex-col gap-4 lg:order-2">
						{beeChildren.map((child) => (
							<GuardianBibleBeeCard key={child.child_id} child={child} />
						))}
					</div>
				) : null}

				<section className="flex min-w-0 flex-col gap-3 lg:order-1">
					<h2 className={GUARDIAN_EYEBROW}>Children</h2>
					{rows.length === 0 ? (
						<Card className={GUARDIAN_CARD}>
							<CardContent className="p-5">
								<p className={GUARDIAN_CARD_BODY}>
									No children are registered for this cycle yet.
								</p>
							</CardContent>
						</Card>
					) : (
						<ul className="flex flex-col gap-2.5">
							{rows.map((row) => {
								const onSite = row.presence === 'on-site';
								return (
									<li key={row.childId}>
										<Link
											href={`/household/children/${row.childId}`}
											className={cn(
												'flex items-center gap-3.5 rounded-lg border bg-card p-3.5 transition-colors',
												'hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden',
												GUARDIAN_CARD
											)}>
											<span aria-hidden="true" className={GUARDIAN_AVATAR_TILE}>
												{row.initials}
											</span>
											{/* `truncate` rather than wrap: a child with four ministries
											    would otherwise grow the row to three lines and push the
											    status pill off the phone's right edge. The full list is on
											    the child's own page, one tap away. */}
											<span className="flex min-w-0 flex-1 flex-col gap-0.5">
												<span className={cn(GUARDIAN_CHILD_NAME, 'truncate')}>
													{row.name}
												</span>
												{row.meta ? (
													<span
														className={cn(GUARDIAN_CHILD_META, 'truncate')}
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
										</Link>
									</li>
								);
							})}
						</ul>
					)}
				</section>
			</div>
		</div>
	);
}
