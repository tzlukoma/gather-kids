'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Cake,
	Camera,
	CircleCheck,
	Clock,
	Heart,
	Lock,
	Pencil,
	User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useHouseholdAttendance } from '@/hooks/data/attendance';
import { getServiceDayIso } from '@/lib/dal';
import type { HouseholdProfileData } from '@/lib/dal';
import type { Child } from '@/lib/types';
import { canUpdateChildPhoto } from '@/lib/permissions';
import { canEditHousehold } from '@/lib/permissions/household';
import { isBirthdayThisWeek } from '@/lib/birthday';
import {
	derivePresence,
	initialsForName,
	PRESENCE_LABEL,
} from '@/lib/guardian-home';
import {
	allergyAlert,
	buildChildHeaderMeta,
	buildEnrollmentRows,
	cycleEyebrow,
	emergencyContactLines,
	pickupGuardians,
	selfCheckoutLine,
	specialNeedsSummary,
} from '@/lib/guardian-child-detail';
import { cn } from '@/lib/utils';
import {
	GUARDIAN_CARD,
	GUARDIAN_GREETING,
	GUARDIAN_PILL_AWAY,
	GUARDIAN_PILL_BASE,
	GUARDIAN_PILL_DOT_ON_SITE,
	GUARDIAN_PILL_ON_SITE,
} from '@/components/gatherKids/guardian-styles';
import {
	CHILD_ALLERGY_BOX,
	CHILD_AVATAR,
	CHILD_AVATAR_CAMERA,
	CHILD_BACK_LINK,
	CHILD_BIRTHDAY_BADGE,
	CHILD_CYCLE_EYEBROW,
	CHILD_FIELD_LABEL,
	CHILD_FIELD_VALUE,
	CHILD_HEADER_META,
	CHILD_OUTLINE_ACTION,
	CHILD_PRIMARY_ACTION,
	CHILD_PROGRAM_LINK,
	CHILD_PROGRAM_ROW,
	CHILD_RULED_GROUP,
	CHILD_SECTION_ACTION,
	CHILD_SECTION_BODY,
	CHILD_SECTION_HEADER,
	CHILD_SECTION_ICON,
	CHILD_SECTION_TITLE,
	CHILD_STAFF_NOTE,
} from '@/components/gatherKids/guardian-child-styles';
import { EditChildModal } from '@/components/gatherKids/edit-child-modal';
import { EditChildEnrollmentsModal } from '@/components/gatherKids/edit-child-enrollments-modal';

// Lazy for the same reason as the legacy page (PERF-06): camera and cropper
// code is only needed once someone opens them.
const PhotoCaptureDialog = dynamic(
	() => import('@/components/gatherKids/photo-capture-dialog').then((m) => m.PhotoCaptureDialog),
	{ loading: () => null }
);
const PhotoViewerDialog = dynamic(
	() => import('@/components/gatherKids/photo-viewer-dialog').then((m) => m.PhotoViewerDialog),
	{ loading: () => null }
);

type ProfileChild = HouseholdProfileData['children'][number];

export const HOUSEHOLD_RECORD_HREF = '/household/details';

function SectionCard({
	icon: Icon,
	title,
	action,
	className,
	children,
}: {
	icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
	title: string;
	/** A control for the section as a whole, at the right of its header. */
	action?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}) {
	const headingId = React.useId();
	return (
		<Card className={cn(GUARDIAN_CARD, 'overflow-hidden', className)}>
			<section aria-labelledby={headingId}>
				<div className={CHILD_SECTION_HEADER}>
					<Icon className={CHILD_SECTION_ICON} aria-hidden />
					<h2 id={headingId} className={CHILD_SECTION_TITLE}>
						{title}
					</h2>
					{action ? <div className="ml-auto">{action}</div> : null}
				</div>
				<div className={CHILD_SECTION_BODY}>{children}</div>
			</section>
		</Card>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span className={CHILD_FIELD_LABEL}>{label}</span>
			<div className={CHILD_FIELD_VALUE}>{children}</div>
		</div>
	);
}

function TodayCard({ childId, className }: { childId: string; className?: string }) {
	// The service day, not the UTC day, as on the home: an evening check-in
	// must not read as tomorrow's.
	const today = React.useMemo(() => getServiceDayIso(), []);
	const { data: attendance } = useHouseholdAttendance(today);
	const presence = derivePresence(childId, attendance);
	const onSite = presence === 'on-site';

	return (
		<SectionCard icon={Clock} title="Today" className={className}>
			<div>
				<span
					className={cn(
						GUARDIAN_PILL_BASE,
						onSite ? GUARDIAN_PILL_ON_SITE : GUARDIAN_PILL_AWAY
					)}
				>
					{onSite ? (
						<span
							className={cn('size-1.5 rounded-full', GUARDIAN_PILL_DOT_ON_SITE)}
							aria-hidden
						/>
					) : null}
					{PRESENCE_LABEL[presence]}
				</span>
			</div>
			<p className={CHILD_STAFF_NOTE}>
				<Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
				<span>Only ministry staff check children out, at the door.</span>
			</p>
		</SectionCard>
	);
}

function MedicalCard({ child, className }: { child: ProfileChild; className?: string }) {
	const allergy = allergyAlert(child.allergies);
	const specialNeeds = specialNeedsSummary(child);
	const medicalNotes = (child.medical_notes ?? '').trim();

	return (
		<SectionCard icon={Heart} title="Medical & care" className={className}>
			{allergy ? (
				<div className={CHILD_ALLERGY_BOX} role="note">
					<AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="text-label-12 font-semibold">Allergies / Medical</span>
						<span className="text-body-14 break-words">{allergy}</span>
					</div>
				</div>
			) : (
				<Field label="Allergies">None on file</Field>
			)}
			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Special needs">
					{specialNeeds.label}
					{specialNeeds.notes ? (
						<p className="mt-1 text-body-13 text-muted-foreground">{specialNeeds.notes}</p>
					) : null}
				</Field>
				<Field label="Medical notes">{medicalNotes || 'None on file'}</Field>
			</div>
		</SectionCard>
	);
}

function EnrollmentsCard({
	child,
	cycleNames,
	activeCycleId,
	onEdit,
	className,
}: {
	child: ProfileChild;
	cycleNames: Record<string, string> | undefined;
	activeCycleId: string | null | undefined;
	/** Present only when the viewer may change this child's enrollments. */
	onEdit?: () => void;
	className?: string;
}) {
	const rows = buildEnrollmentRows(child, activeCycleId);
	const eyebrow = cycleEyebrow(cycleNames, activeCycleId);

	return (
		<SectionCard
			icon={CircleCheck}
			title="Program enrollments"
			className={className}
			action={
				onEdit ? (
					<Button
						variant="outline"
						size="sm"
						className={CHILD_SECTION_ACTION}
						onClick={onEdit}
					>
						<Pencil aria-hidden />
						Edit enrollments
					</Button>
				) : null
			}
		>
			{eyebrow ? <p className={CHILD_CYCLE_EYEBROW}>{eyebrow}</p> : null}
			{rows.length > 0 ? (
				<ul className="flex flex-col gap-2">
					{rows.map((row) => (
						<li key={row.key} className={CHILD_PROGRAM_ROW}>
							<span className="min-w-0 truncate text-body-14 text-foreground">
								{row.name}
							</span>
							<span className="flex shrink-0 items-center gap-3">
								{row.isBibleBee ? (
									<Link
										href={`/household/children/${child.child_id}/bible-bee`}
										className={CHILD_PROGRAM_LINK}
									>
										View progress
										<ArrowRight className="size-3.5" aria-hidden />
									</Link>
								) : null}
								<span
									className={cn(
										GUARDIAN_PILL_BASE,
										'py-0.5',
										row.status === 'enrolled'
											? GUARDIAN_PILL_ON_SITE
											: GUARDIAN_PILL_AWAY
									)}
								>
									{row.status === 'enrolled' ? 'Enrolled' : 'Interested'}
								</span>
							</span>
						</li>
					))}
				</ul>
			) : (
				<p className="text-body-14 text-muted-foreground">
					Not signed up for any programs this cycle.
				</p>
			)}
			<p className="text-body-13 text-muted-foreground">
				Earlier cycles are listed on the{' '}
				<Link href={HOUSEHOLD_RECORD_HREF} className="text-primary underline-offset-4 hover:underline">
					household page
				</Link>
				.
			</p>
		</SectionCard>
	);
}

function PickupCard({
	child,
	profileData,
	todayIso,
	className,
}: {
	child: ProfileChild;
	profileData: HouseholdProfileData;
	todayIso: string;
	className?: string;
}) {
	const contact = emergencyContactLines(profileData.emergencyContact);
	const guardians = pickupGuardians(profileData.guardians);
	const selfCheckout = selfCheckoutLine(child, todayIso);

	return (
		<SectionCard icon={User} title="Pickup & safety" className={className}>
			<div className={CHILD_RULED_GROUP}>
				<span className={CHILD_FIELD_LABEL}>Emergency contact</span>
				{contact ? (
					<div className={CHILD_FIELD_VALUE}>
						<p>{contact.name}</p>
						{contact.phone ? <p className="tabular-nums">{contact.phone}</p> : null}
					</div>
				) : (
					<p className={CHILD_FIELD_VALUE}>None on file</p>
				)}
			</div>
			<div className={CHILD_RULED_GROUP}>
				<span className={CHILD_FIELD_LABEL}>Approved for pickup</span>
				{guardians.length > 0 ? (
					<ul className={cn(CHILD_FIELD_VALUE, 'flex flex-col gap-0.5')}>
						{guardians.map((guardian, index) => (
							<li key={`${guardian.name}-${index}`}>
								{guardian.name}
								{guardian.phone ? (
									<span className="text-muted-foreground tabular-nums"> · {guardian.phone}</span>
								) : null}
							</li>
						))}
					</ul>
				) : (
					<p className={CHILD_FIELD_VALUE}>None on file</p>
				)}
			</div>
			<div className={CHILD_RULED_GROUP}>
				<span className={CHILD_FIELD_LABEL}>Self check-out</span>
				<p className={CHILD_FIELD_VALUE}>{selfCheckout.text}</p>
			</div>
		</SectionCard>
	);
}

/**
 * The GatherSystem child page (`2c child`, frames 100:2 and 100:157).
 *
 * Reads only the guardian's own household profile, which the legacy page
 * already loaded, plus the same own-children attendance the home uses. The
 * edit and photo dialogs are the existing ones, per the signed spec.
 */
export function GuardianChildGatherSystem({
	child,
	profileData,
}: {
	child: ProfileChild;
	profileData: HouseholdProfileData;
}) {
	const { user } = useAuth();
	const [capturing, setCapturing] = React.useState<Child | null>(null);
	const [viewing, setViewing] = React.useState<{ name: string; url: string } | null>(null);
	const [editing, setEditing] = React.useState(false);
	const [editingEnrollments, setEditingEnrollments] = React.useState(false);

	const todayIso = React.useMemo(() => getServiceDayIso(), []);
	const householdId = profileData.household?.household_id ?? child.household_id;
	const canUpdatePhoto = canUpdateChildPhoto(user, child);
	const canEdit = canEditHousehold(user, householdId);

	const name = [child.first_name, child.last_name].filter(Boolean).join(' ');
	const initials = initialsForName(child.first_name, child.last_name);
	const meta = buildChildHeaderMeta({
		grade: child.grade,
		dob: child.dob,
		householdName: profileData.household?.name,
		todayIso,
	});
	const birthday = isBirthdayThisWeek(child.dob);

	return (
		<div className="flex flex-col gap-6">
			<Link href={HOUSEHOLD_RECORD_HREF} className={cn(CHILD_BACK_LINK, 'self-start')}>
				<ArrowLeft className="size-3.5" aria-hidden />
				Back to household
			</Link>

			<header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
					<div className="relative self-start">
						{child.photo_url ? (
							<button
								type="button"
								className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								onClick={() => setViewing({ name, url: child.photo_url! })}
								aria-label={`View ${child.first_name}'s photo`}
							>
								<Avatar className={CHILD_AVATAR}>
									<AvatarImage src={child.photo_url} alt="" className="object-cover" />
									<AvatarFallback className="bg-transparent">{initials}</AvatarFallback>
								</Avatar>
							</button>
						) : (
							<div className={CHILD_AVATAR} aria-hidden>
								{initials}
							</div>
						)}
						{canUpdatePhoto ? (
							<button
								type="button"
								className={CHILD_AVATAR_CAMERA}
								onClick={() => setCapturing(child)}
								aria-label={`Update ${child.first_name}'s photo`}
							>
								<Camera className="size-3.5" aria-hidden />
							</button>
						) : null}
					</div>

					<div className="flex min-w-0 flex-col gap-1.5">
						<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
							<h1 className={GUARDIAN_GREETING}>{name}</h1>
							{birthday ? (
								<span className={CHILD_BIRTHDAY_BADGE}>
									<Cake className="size-3.5 text-brand-orange" aria-hidden />
									Birthday this week
								</span>
							) : null}
						</div>
						{meta ? <p className={CHILD_HEADER_META}>{meta}</p> : null}
					</div>
				</div>

				{canUpdatePhoto || canEdit ? (
					<div className="grid grid-cols-2 gap-3 lg:flex lg:shrink-0">
						{canUpdatePhoto ? (
							<Button
								variant="outline"
								className={CHILD_OUTLINE_ACTION}
								onClick={() => setCapturing(child)}
							>
								<Camera aria-hidden />
								Update photo
							</Button>
						) : null}
						{canEdit ? (
							<Button
								className={cn(CHILD_PRIMARY_ACTION, !canUpdatePhoto && 'col-span-2')}
								onClick={() => setEditing(true)}
							>
								<Pencil aria-hidden />
								Edit profile
							</Button>
						) : null}
					</div>
				) : null}
			</header>

			{/*
			 * The DOM follows the phone order — Today, Medical, Programs, Pickup —
			 * so reading and focus order match what a phone shows. On a wide screen
			 * the grid lifts Today and Pickup into a right-hand column and the
			 * middle pair spans both rows on the left.
			 */}
			<div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]">
				<TodayCard
					childId={child.child_id}
					className="lg:col-start-2 lg:row-start-1 lg:self-start"
				/>
				<div className="flex flex-col gap-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
					<MedicalCard child={child} />
					<EnrollmentsCard
						child={child}
						cycleNames={profileData.cycleNames}
						activeCycleId={profileData.activeCycleId}
						// Same rule as the household record: an editor, and only
						// for a child still active in the household.
						onEdit={
							canEdit && child.is_active !== false
								? () => setEditingEnrollments(true)
								: undefined
						}
					/>
				</div>
				<PickupCard
					child={child}
					profileData={profileData}
					todayIso={todayIso}
					className="lg:col-start-2 lg:row-start-2 lg:self-start"
				/>
			</div>

			<PhotoCaptureDialog child={capturing} onClose={() => setCapturing(null)} />
			<PhotoViewerDialog photo={viewing} onClose={() => setViewing(null)} />
			{editingEnrollments ? (
				<EditChildEnrollmentsModal
					child={child}
					householdId={householdId}
					currentEnrollments={child.enrollmentsByCycle}
					onClose={() => setEditingEnrollments(false)}
				/>
			) : null}
			{editing ? (
				<EditChildModal
					child={child}
					householdId={householdId}
					onClose={() => setEditing(false)}
				/>
			) : null}
		</div>
	);
}
