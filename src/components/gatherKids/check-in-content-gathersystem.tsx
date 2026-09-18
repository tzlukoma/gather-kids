'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
	AlertTriangle,
	Camera,
	CheckCircle,
	Info,
	Printer,
	Search,
	ShieldAlert,
	Smartphone,
	Users,
	X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChildrenForActiveCycle, useAttendance } from '@/hooks/data';
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';
import { getTodayIsoDate } from '@/lib/dal';
import type { Attendance, Child } from '@/lib/types';
import { normalizeGradeDisplay, getGradeSortOrder } from '@/lib/gradeUtils';
import { EVENT_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
	useGuardians,
	useHouseholds,
	useEmergencyContacts,
	useCheckInMutation,
	useCheckOutMutation,
} from '@/hooks/data';
import { useToast } from '@/hooks/use-toast';
import { parseISO, differenceInYears, format } from 'date-fns';
import type { EnrichedChild } from '@/components/gatherKids/check-in-view';
import { CheckoutDialog } from '@/components/gatherKids/checkout-dialog';
import { IncidentDetailsDialog } from '@/components/gatherKids/incident-details-dialog';
// PERF-06: the camera/photo dialogs are heavy and only needed on demand. Loaded
// the same way `check-in-view.tsx` loads them so the door's first paint is not
// carrying a media stack it will usually never open.
const PhotoCaptureDialog = dynamic(
	() =>
		import('@/components/gatherKids/photo-capture-dialog').then(
			(m) => m.PhotoCaptureDialog
		),
	{ loading: () => null }
);
const PhotoViewerDialog = dynamic(
	() =>
		import('@/components/gatherKids/photo-viewer-dialog').then(
			(m) => m.PhotoViewerDialog
		),
	{ loading: () => null }
);
import { useIncidents } from '@/hooks/data';
import { captureAnalyticsEvent } from '@/lib/analytics/browser';
import { useAuth } from '@/contexts/auth-context';
import { canUpdateChildPhoto } from '@/lib/permissions';
import { formatPhone } from '@/hooks/usePhoneFormat';
import { getEventName } from '@/lib/constants';
import {
	computeDoorStats,
	countDoorStatuses,
	deriveDoorRowStatus,
	formatDoorStatusLabel,
	isOnSite,
	matchesDoorStatusFilter,
	selectableForCheckIn,
	summarizeSelectedHouseholds,
	type DoorStatusFilter,
} from '@/lib/door-check-in';

/**
 * The contact detail the door needs in hand before releasing a child: who may
 * collect them, on what number, and whether they may leave on their own.
 *
 * This mirrors the popover on the legacy `ChildCard` field for field. It is a
 * local component rather than a shared one because extracting it would mean
 * editing `child-card.tsx`, which sits on the flag-off path this PR guarantees
 * is byte-identical to `main`. Worth folding together once the door is no
 * longer behind a flag.
 */
function ChildDoorInfo({ child }: { child: EnrichedChild }) {
	const canSelfCheckout = child.age !== null && child.age >= 13;

	return (
		<div className="space-y-4">
			<div>
				<h4 className="font-semibold font-headline mb-2">
					{child.first_name} {child.last_name}
				</h4>
				<div className="text-sm text-muted-foreground space-y-1">
					<p>
						<strong className="text-foreground">DOB:</strong>{' '}
						{child.dob ? format(parseISO(child.dob), 'MMM d, yyyy') : 'N/A'}
						{child.age !== null ? ` (${child.age} yrs)` : ''}
					</p>
					<p>
						<strong className="text-foreground">Grade:</strong>{' '}
						{normalizeGradeDisplay(child.grade)}
					</p>
					{child.medical_notes && (
						<p>
							<strong className="text-foreground">Notes:</strong>{' '}
							{child.medical_notes}
						</p>
					)}
				</div>
			</div>

			{canSelfCheckout && child.child_mobile && (
				<div>
					<h4 className="font-semibold font-headline mb-2 flex items-center gap-2">
						<CheckCircle aria-hidden="true" className="h-4 w-4 text-green-500" />{' '}
						Self-Checkout Allowed
					</h4>
					<p className="text-sm text-muted-foreground flex items-center gap-2">
						<Smartphone aria-hidden="true" size={14} />
						{formatPhone(child.child_mobile)}
					</p>
				</div>
			)}

			<Separator />

			<div>
				<h4 className="font-semibold font-headline mb-2">Guardians</h4>
				<div className="space-y-3">
					{child.guardians?.map((g) => (
						<div key={g.guardian_id} className="text-sm">
							<p className="font-medium">
								{g.first_name} {g.last_name} ({g.relationship})
							</p>
							<p className="text-muted-foreground">
								{g.mobile_phone ? formatPhone(g.mobile_phone) : 'N/A'}
							</p>
						</div>
					))}
					{!child.guardians?.length && (
						<p className="text-sm text-muted-foreground">
							No guardian information available.
						</p>
					)}
				</div>
			</div>

			<Separator />

			<div>
				<h4 className="font-semibold font-headline mb-2">Emergency Contact</h4>
				{child.emergencyContact ? (
					<div className="text-sm">
						<p className="font-medium">
							{child.emergencyContact.first_name}{' '}
							{child.emergencyContact.last_name} (
							{child.emergencyContact.relationship})
						</p>
						<p className="text-muted-foreground">
							{child.emergencyContact.mobile_phone
								? formatPhone(child.emergencyContact.mobile_phone)
								: 'N/A'}
						</p>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						No emergency contact available.
					</p>
				)}
			</div>
		</div>
	);
}

/**
 * Wire value for the status tabs. `checkedOut` is the historical value for
 * "Not checked in" and is deep-linked from the admin dashboard, so it is kept.
 */
export type StatusFilter = DoorStatusFilter;

// Module-level constants
const EMPTY_CHILDREN: Child[] = [];
const EMPTY_ATTENDANCE: Attendance[] = [];
const EMPTY_GUARDIANS: import('@/lib/types').Guardian[] = [];
const EMPTY_HOUSEHOLDS: import('@/lib/types').Household[] = [];
const EMPTY_EMERGENCY_CONTACTS: import('@/lib/types').EmergencyContact[] = [];
const EMPTY_INCIDENTS: import('@/lib/types').Incident[] = [];

export function CheckInContentGatherSystem() {
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const { user } = useAuth();

	const urlFilter = searchParams?.get('filter');
	const urlEvent = searchParams?.get('event');
	const searchKey = searchParams?.toString() ?? '';
	const initialStatus: StatusFilter =
		urlFilter === 'checkedIn' || urlFilter === 'checkedOut' || urlFilter === 'all'
			? urlFilter
			: 'all';
	const initialEvent =
		urlEvent && EVENT_OPTIONS.find((e) => e.id === urlEvent)
			? urlEvent
			: 'evt_sunday_school';

	const [selectedEvent, setSelectedEvent] = useState(initialEvent);
	const [selectedGrades, setSelectedGrades] = useState<Set<string>>(() => new Set());
	const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());
	const [prevSearchKey, setPrevSearchKey] = useState(searchKey);
	const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
	const [childToCheckout, setChildToCheckout] = useState<EnrichedChild | null>(null);
	/**
	 * Detail surfaces the legacy `ChildCard` owned and the GatherSystem door lost
	 * in #383: the incident detail, the full-size photo, and photo capture. Same
	 * components, same props, same authorization helper as `check-in-view.tsx`.
	 */
	const [selectedIncidents, setSelectedIncidents] = useState<
		import('@/lib/types').Incident[] | null
	>(null);
	const [selectedChildForPhoto, setSelectedChildForPhoto] =
		useState<EnrichedChild | null>(null);
	const [viewingPhoto, setViewingPhoto] = useState<{
		name: string;
		url: string;
	} | null>(null);

	const today = getTodayIsoDate();

	// Data hooks
	const {
		data: children = EMPTY_CHILDREN,
		isLoading: childrenLoading,
		error: childrenError,
	} = useChildrenForActiveCycle();
	const {
		data: todaysAttendance = EMPTY_ATTENDANCE,
		isLoading: attendanceLoading,
		error: attendanceError,
	} = useAttendance(today);
	const { data: allGuardians = EMPTY_GUARDIANS } = useGuardians();
	const { data: allHouseholds = EMPTY_HOUSEHOLDS } = useHouseholds();
	const { data: allEmergencyContacts = EMPTY_EMERGENCY_CONTACTS } = useEmergencyContacts();
	const { data: todaysIncidents = EMPTY_INCIDENTS, isLoading: incidentsLoading } = useIncidents(today);

	const checkInMutation = useCheckInMutation();
	const checkOutMutation = useCheckOutMutation();

	const loading = childrenLoading || attendanceLoading || incidentsLoading;
	const loadError = childrenError || attendanceError;

	// URL param sync
	if (searchKey !== prevSearchKey) {
		setPrevSearchKey(searchKey);
		if (
			urlFilter === 'checkedIn' ||
			urlFilter === 'checkedOut' ||
			urlFilter === 'all'
		) {
			setStatusFilter(urlFilter);
		}
		if (urlEvent && EVENT_OPTIONS.find((e) => e.id === urlEvent)) {
			setSelectedEvent(urlEvent);
		}
	}

	// "/" shortcut for search
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === '/' && e.target instanceof Element && e.target.tagName !== 'INPUT') {
				e.preventDefault();
				document.getElementById('gathersystem-search')?.focus();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);

	// Enrich children with additional data
	const enrichedChildren = useMemo<EnrichedChild[]>(() => {
		if (!children || !todaysAttendance || !todaysIncidents || incidentsLoading)
			return [];

		const attendanceByChild = new Map<string, Attendance[]>();
		todaysAttendance.forEach((a) => {
			if (!attendanceByChild.has(a.child_id)) {
				attendanceByChild.set(a.child_id, []);
			}
			attendanceByChild.get(a.child_id)!.push(a);
		});

		const incidentsByChild = new Map<string, import('@/lib/types').Incident[]>();
		todaysIncidents.forEach((i) => {
			if (!incidentsByChild.has(i.child_id)) {
				incidentsByChild.set(i.child_id, []);
			}
			incidentsByChild.get(i.child_id)!.push(i);
		});

		const householdIds = children.map((c) => c.household_id);

		const relevantGuardians = allGuardians.filter((g) =>
			householdIds.includes(g.household_id)
		);
		const relevantHouseholds = allHouseholds.filter((h) =>
			householdIds.includes(h.household_id)
		);
		const relevantEmergencyContacts = allEmergencyContacts.filter(
			(ec) => householdIds.includes(ec.household_id)
		);

		const guardianMap = new Map<string, import('@/lib/types').Guardian[]>();
		relevantGuardians.forEach((g) => {
			if (!guardianMap.has(g.household_id)) {
				guardianMap.set(g.household_id, []);
			}
			guardianMap.get(g.household_id)!.push(g);
		});

		const householdMap = new Map<string, import('@/lib/types').Household>();
		relevantHouseholds.forEach((h) => {
			householdMap.set(h.household_id, h);
		});

		const emergencyContactMap = new Map<string, import('@/lib/types').EmergencyContact>();
		relevantEmergencyContacts.forEach((ec) => {
			emergencyContactMap.set(ec.household_id, ec);
		});

		return children.map((c) => {
			const activeAttendance =
				attendanceByChild.get(c.child_id)?.find((a) => !a.check_out_at) || null;
			const childIncidents = incidentsByChild.get(c.child_id) || [];
			const guardians = guardianMap.get(c.household_id) || [];
			const household = householdMap.get(c.household_id) || null;
			const emergencyContact = emergencyContactMap.get(c.household_id) || null;

			return {
				...c,
				activeAttendance,
				guardians,
				household,
				emergencyContact,
				incidents: childIncidents,
				age: c.dob ? differenceInYears(new Date(), parseISO(c.dob)) : null,
			};
		});
	}, [
		children,
		todaysAttendance,
		todaysIncidents,
		incidentsLoading,
		allGuardians,
		allHouseholds,
		allEmergencyContacts,
	]);

	// Stats cards (item 2) and live tab counts (item 3) — see lib/door-check-in.
	const stats = useMemo(
		() => computeDoorStats(enrichedChildren, todaysIncidents, selectedEvent),
		[enrichedChildren, todaysIncidents, selectedEvent]
	);
	const statusCounts = useMemo(
		() => countDoorStatuses(enrichedChildren, selectedEvent),
		[enrichedChildren, selectedEvent]
	);

	const currentEventName = useMemo(
		() => EVENT_OPTIONS.find((e) => e.id === selectedEvent)?.name || 'Select Event',
		[selectedEvent]
	);

	// Derived from `today` — the same string the roster, counts and incidents are
	// queried with — rather than from `new Date()`. Read independently, the label
	// and the data below it can disagree: whenever the browser's local day differs
	// from the day being queried, the header names one date while the rows belong
	// to another, with nothing on screen to say so.
	const eyebrow = `${currentEventName} · ${format(parseISO(today), 'EEE MMM d')}`;

	const availableGrades = useMemo(() => {
		if (!children) return [];
		const grades = new Set(
			children
				.map((c) => normalizeGradeDisplay(c.grade))
				.filter(Boolean) as string[]
		);
		return Array.from(grades).sort(
			(a, b) => getGradeSortOrder(a) - getGradeSortOrder(b)
		);
	}, [children]);

	const toggleGrade = (grade: string) => {
		setSelectedGrades((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(grade)) {
				newSet.delete(grade);
			} else {
				newSet.add(grade);
			}
			return newSet;
		});
	};

	const toggleChildSelection = (childId: string) => {
		setSelectedChildIds((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(childId)) {
				newSet.delete(childId);
			} else {
				newSet.add(childId);
			}
			return newSet;
		});
	};

	const filteredChildren = useMemo(() => {
		let results = enrichedChildren;

		if (searchQuery) {
			const lowercasedQuery = searchQuery.toLowerCase();
			results = results.filter(
				(child) =>
					child.first_name.toLowerCase().includes(lowercasedQuery) ||
					child.last_name.toLowerCase().includes(lowercasedQuery) ||
					(child.household?.name &&
						child.household.name.toLowerCase().includes(lowercasedQuery))
			);
		}

		if (selectedGrades.size > 0) {
			results = results.filter(
				(child) =>
					child.grade &&
					Array.from(selectedGrades).includes(normalizeGradeDisplay(child.grade))
			);
		}

		return results.filter((child) =>
			matchesDoorStatusFilter(child, statusFilter, selectedEvent)
		);
	}, [searchQuery, enrichedChildren, selectedGrades, statusFilter, selectedEvent]);

	/**
	 * Rows in view that a bulk check-in would act on. A child already on site at
	 * *any* event is excluded, not just at this one — checking a child into two
	 * events at once is what the legacy card's `disabled={!!checkedInEvent}`
	 * prevented.
	 */
	const selectableRows = useMemo(
		() => filteredChildren.filter((child) => !isOnSite(child)),
		[filteredChildren]
	);
	const allSelectableSelected =
		selectableRows.length > 0 &&
		selectableRows.every((child) => selectedChildIds.has(child.child_id));

	const toggleSelectAll = () => {
		setSelectedChildIds((prev) => {
			const next = new Set(prev);
			if (allSelectableSelected) {
				selectableRows.forEach((child) => next.delete(child.child_id));
			} else {
				selectableRows.forEach((child) => next.add(child.child_id));
			}
			return next;
		});
	};

	/** Single-row check-in. Same mutation contract as the legacy screen. */
	const handleCheckIn = async (childId: string) => {
		try {
			await checkInMutation.mutateAsync({
				childId,
				eventId: selectedEvent,
				userId: 'user_admin',
			});
			captureAnalyticsEvent('child_checked_in', { check_in_event: selectedEvent });

			const child = enrichedChildren.find((c) => c.child_id === childId);

			toast({
				title: 'Checked In',
				description: `${child?.first_name} ${
					child?.last_name
				} has been checked in to ${getEventName(selectedEvent)}.`,
			});

			setSelectedChildIds((prev) => {
				if (!prev.has(childId)) return prev;
				const next = new Set(prev);
				next.delete(childId);
				return next;
			});
		} catch (e: any) {
			console.error(e);
			toast({
				title: 'Check-in Failed',
				description: e?.message || 'Failed to check in child. Please try again.',
			});
		}
	};

	/**
	 * Check-out. Restores the parity gap against the legacy door screen: the
	 * mutation argument shape, the analytics event, and the toast copy all match
	 * `check-in-view.tsx`, and verification still runs through `CheckoutDialog`
	 * (guardian/emergency-contact PIN or a logged admin override).
	 */
	const handleCheckOut = async (
		childId: string,
		attendanceId: string,
		verifier: { method: 'PIN' | 'other'; value: string; pickedUpBy?: string }
	) => {
		try {
			await checkOutMutation.mutateAsync({
				attendanceId,
				verifier,
			});
			captureAnalyticsEvent('child_checked_out', { check_in_event: selectedEvent });

			const child = enrichedChildren.find((c) => c.child_id === childId);

			toast({
				title: 'Checked Out',
				description: `${child?.first_name} ${child?.last_name} has been checked out successfully.`,
			});
		} catch (e: any) {
			console.error(e);
			toast({
				title: 'Check-out Failed',
				description:
					e?.message || 'Failed to check out child. Please try again.',
			});
		}
	};

	const handleCheckInSelected = async () => {
		const childrenToCheckIn = selectableForCheckIn(enrichedChildren, selectedChildIds);

		if (childrenToCheckIn.length === 0) {
			toast({
				title: 'No children to check in',
				description: 'Selected children are already checked in.',
			});
			return;
		}

		try {
			await Promise.all(
				childrenToCheckIn.map((child) =>
					checkInMutation.mutateAsync({
						childId: child.child_id,
						eventId: selectedEvent,
						userId: 'user_admin',
					})
				)
			);

			captureAnalyticsEvent('child_checked_in', {
				check_in_event: selectedEvent,
			});

			toast({
				title: 'Checked In',
				description: `${childrenToCheckIn.length} ${childrenToCheckIn.length === 1 ? 'child' : 'children'} checked in to ${getEventName(selectedEvent)}.`,
			});

			setSelectedChildIds(new Set());
		} catch (e: any) {
			console.error(e);
			toast({
				title: 'Check-in Failed',
				description: e?.message || 'Failed to check in children. Please try again.',
			});
		}
	};

	const handlePrintRoster = () => {
		if (typeof window !== 'undefined') window.print();
	};

	if (loading) {
		return <CardGridSkeleton count={8} />;
	}

	const selectedCount = selectedChildIds.size;
	const householdSummary = summarizeSelectedHouseholds(
		enrichedChildren,
		selectedChildIds
	);
	const canCheckIn =
		selectableForCheckIn(enrichedChildren, selectedChildIds).length > 0;
	const hasActiveFilters =
		!!searchQuery || selectedGrades.size > 0 || statusFilter !== 'all';

	return (
		<div className="flex flex-col gap-4 md:gap-6 pb-28">
			{/* Header: event context, Change event, Print roster (item 4) */}
			<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
						{eyebrow}
					</p>
					<h1 className="text-2xl md:text-3xl font-bold font-headline">
						Child Check-In &amp; Out
					</h1>
				</div>
				<div className="flex flex-wrap gap-2 print:hidden">
					<Button variant="outline" onClick={() => setIsEventDialogOpen(true)}>
						Change event
					</Button>
					<Button onClick={handlePrintRoster}>
						<Printer aria-hidden="true" />
						Print roster
					</Button>
				</div>
			</div>

			{loadError && (
				<div
					role="alert"
					className="rounded-md border border-destructive bg-destructive/5 p-3 text-sm text-destructive">
					We could not load the check-in roster. Check the connection and refresh
					before using this screen at the door.
				</div>
			)}

			{/* Stats cards (item 2) */}
			<section
				aria-label="Check-in summary"
				className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Card className="h-full">
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
							On site now
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">
							{stats.onSite}
							<span className="text-base font-medium text-muted-foreground">
								{' '}
								of {stats.total}
							</span>
						</div>
					</CardContent>
				</Card>
				<Card className="h-full">
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
							Not checked in
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-baseline gap-2">
							<span className="text-3xl font-bold">{stats.notCheckedIn}</span>
							{stats.checkedInElsewhere > 0 && (
								<span className="text-xs text-muted-foreground">
									{stats.checkedInElsewhere} in another event
								</span>
							)}
						</div>
					</CardContent>
				</Card>
				<Card className="h-full">
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
							Open incidents
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-baseline gap-2">
							<span
								className={`text-3xl font-bold ${
									stats.openIncidents > 0 ? 'text-destructive' : ''
								}`}>
								{stats.openIncidents}
							</span>
							<span className="text-xs text-muted-foreground">
								{stats.openIncidents > 0
									? 'needs admin acknowledgment'
									: 'nothing needs acknowledgment'}
							</span>
						</div>
					</CardContent>
				</Card>
			</section>

			{/* Search + status tabs (item 3) */}
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between print:hidden">
				<div className="relative flex-1">
					<Search
						aria-hidden="true"
						className="absolute left-3 top-1/2 -translate-y-1/2 h-4 md:h-5 w-4 md:w-5 text-muted-foreground"
					/>
					<Input
						id="gathersystem-search"
						placeholder="Search children or household…"
						aria-label="Search children or household"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9 md:pl-10 pr-16 h-10 md:h-12 text-sm md:text-base"
					/>
					{searchQuery ? (
						<button
							type="button"
							aria-label="Clear search"
							onClick={() => setSearchQuery('')}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
							<X className="h-4 md:h-5 w-4 md:w-5" />
						</button>
					) : (
						<kbd
							aria-hidden="true"
							className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
							/
						</kbd>
					)}
				</div>

				{/*
				  Labels shorten below `lg`. TabsTrigger is `whitespace-nowrap` with
				  `px-3`, so in a three-column grid on a 320px phone the full copy is
				  wider than its cell and adjacent triggers overlap into each other —
				  no page overflow, just unreadable. The counts are appended to the
				  label, so a larger roster makes it worse. `aria-label` keeps the
				  full phrase for assistive tech at every width, and the counts are
				  `tabular-nums` so they do not jitter as children check in.

				  The breakpoint is measured, not guessed: "Not checked in 18" needs a
				  ~148px cell, and while the list is `w-full grid-cols-3` the columns
				  split the container evenly — 127px at 420px, 121px at 402px. An
				  earlier 420px breakpoint looked correct in a 320px screenshot and
				  still clipped at 420.

				  `lg` rather than `sm` because that is where the row layout gives the
				  list its own width. At `md` the admin sidebar appears and squeezes
				  the content column: a 768px tablet gave 152px per cell, four short of
				  the 156px "Not checked in 188" needs once a roster reaches three
				  digits. Full labels therefore wait for `lg`, where the list is
				  content-sized and the measurement is clean from 320px to 1536px.
				*/}
				<Tabs
					value={statusFilter}
					onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
					<TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
						<TabsTrigger
							value="all"
							aria-label={`All ${statusCounts.all}`}
							className="min-w-0 gap-1 px-1.5 text-xs lg:px-3 lg:text-sm">
							<span className="truncate">All</span>
							<span className="tabular-nums">{statusCounts.all}</span>
						</TabsTrigger>
						<TabsTrigger
							value="checkedIn"
							aria-label={`Checked in ${statusCounts.checkedIn}`}
							className="min-w-0 gap-1 px-1.5 text-xs lg:px-3 lg:text-sm">
							<span className="truncate">
								<span className="lg:hidden">In</span>
								<span className="hidden lg:inline">Checked in</span>
							</span>
							<span className="tabular-nums">{statusCounts.checkedIn}</span>
						</TabsTrigger>
						<TabsTrigger
							value="checkedOut"
							aria-label={`Not checked in ${statusCounts.notCheckedIn}`}
							className="min-w-0 gap-1 px-1.5 text-xs lg:px-3 lg:text-sm">
							<span className="truncate">
								<span className="lg:hidden">Not in</span>
								<span className="hidden lg:inline">Not checked in</span>
							</span>
							<span className="tabular-nums">{statusCounts.notCheckedIn}</span>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Grade chips (item 8) */}
			<div className="flex flex-wrap gap-2 items-center print:hidden">
				<span className="text-xs md:text-sm font-semibold text-muted-foreground">
					Grade
				</span>
				{availableGrades.map((grade) => (
					<Badge
						key={grade}
						variant={selectedGrades.has(grade) ? 'default' : 'outline'}
						className="cursor-pointer px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm"
						onClick={() => toggleGrade(grade)}>
						{grade}
					</Badge>
				))}
				{selectedGrades.size > 0 && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setSelectedGrades(new Set())}
						className="h-6 md:h-7 text-xs px-2">
						Clear
					</Button>
				)}
			</div>

			{/*
			  Select-all for phone widths, where the table header that carries it
			  is hidden. Same control and same handler; it just has nowhere to
			  live once the rows stop being rows, and here it can afford a
			  visible label instead of an aria-label.
			*/}
			{selectableRows.length > 0 && (
				<div className="flex items-center gap-2 md:hidden print:hidden">
					{/* Named by the visible Label beside it, not an aria-label. */}
					<Checkbox
						id="door-select-all-mobile"
						checked={allSelectableSelected}
						onCheckedChange={toggleSelectAll}
					/>
					<Label
						htmlFor="door-select-all-mobile"
						className="text-xs font-semibold text-muted-foreground">
						Select all not checked in ({selectableRows.length})
					</Label>
				</div>
			)}

			{/* Roster table (item 5) */}
			<Card>
				<CardContent className="p-0">
					{filteredChildren.length === 0 ? (
						<EmptyState
							icon={Users}
							title={
								hasActiveFilters
									? 'No children match your current filters.'
									: 'No children found.'
							}
							description={
								hasActiveFilters
									? 'Clear the search, grade or status filters to see the full roster.'
									: 'No children are registered for the active cycle yet.'
							}
						/>
					) : (
						<Table>
							{/*
							  Below `md` each row becomes a two-line block (see TableRow), so
							  the column headings no longer sit above anything. The select-all
							  control moves into the filter bar for those widths.
							*/}
							<TableHeader className="hidden md:table-header-group">
								<TableRow>
									<TableHead className="w-10 print:hidden">
										<Checkbox
											checked={allSelectableSelected}
											disabled={selectableRows.length === 0}
											onCheckedChange={toggleSelectAll}
											aria-label="Select all children not yet checked in"
										/>
									</TableHead>
									<TableHead>Child</TableHead>
									<TableHead className="hidden md:table-cell">Grade</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right print:hidden">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredChildren.map((child) => {
									const rowStatus = deriveDoorRowStatus(child, selectedEvent);
									const isCheckedIn = rowStatus.status === 'checkedIn';
									const isElsewhere = rowStatus.status === 'checkedInElsewhere';
									// On site at any event — the check-in guard, as distinct from
									// `isCheckedIn`, which is scoped to the event this door runs.
									const onSiteAnywhere = isOnSite(child);
									const isSelected = selectedChildIds.has(child.child_id);
									const hasAllergies =
										!!child.allergies &&
										child.allergies.toLowerCase() !== 'none';
									const hasIncidents = child.incidents.length > 0;

									return (
										/*
										 * A five-column table does not fit a phone. Rather than
										 * let the Action column scroll off the right — which is
										 * how the check-out button became unreachable at the door
										 * — the row becomes a two-line grid below `md`:
										 *
										 *   [✓] [photo] Name · chips · household
										 *       [status]            [info] [Check out]
										 *
										 * and goes back to being a table row at `md` and up.
										 */
										<TableRow
											key={child.child_id}
											data-state={isSelected ? 'selected' : undefined}
											className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 p-3 md:table-row md:p-0 ${
												isSelected ? 'bg-brand-teal/10' : ''
											}`}>
											<TableCell className="col-start-1 row-start-1 p-0 md:table-cell md:p-4 print:hidden">
												<Checkbox
													checked={isSelected}
													disabled={onSiteAnywhere}
													onCheckedChange={() =>
														toggleChildSelection(child.child_id)
													}
													aria-label={`Select ${child.first_name} ${child.last_name}`}
												/>
											</TableCell>

											<TableCell className="col-start-2 col-span-2 row-start-1 min-w-0 p-0 md:table-cell md:p-4">
												<div className="flex items-center gap-3">
													{/* 56×56 photo, radius 0.5rem (item 7). Tapping it opens
													    the full-size viewer and the camera badge opens capture,
													    both as the legacy card offered. */}
													<div className="relative w-12 h-12 md:w-14 md:h-14 shrink-0">
														<button
															type="button"
															disabled={!child.photo_url}
															onClick={() =>
																child.photo_url &&
																setViewingPhoto({
																	name: `${child.first_name} ${child.last_name}`,
																	url: child.photo_url,
																})
															}
															className="w-full h-full rounded-lg disabled:cursor-default"
															aria-label={
																child.photo_url
																	? `View photo of ${child.first_name} ${child.last_name}`
																	: `No photo on file for ${child.first_name} ${child.last_name}`
															}>
															<Avatar className="w-full h-full rounded-lg">
																<AvatarImage
																	src={child.photo_url}
																	alt={`${child.first_name} ${child.last_name}`}
																/>
																<AvatarFallback className="rounded-lg text-sm font-semibold bg-muted">
																	{child.first_name[0]}
																	{child.last_name[0]}
																</AvatarFallback>
															</Avatar>
														</button>
														{canUpdateChildPhoto(user, child) && (
															<Button
																variant="outline"
																size="icon"
																onClick={() => setSelectedChildForPhoto(child)}
																className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background print:hidden"
																aria-label={`Update photo for ${child.first_name} ${child.last_name}`}>
																<Camera aria-hidden="true" className="h-3 w-3" />
															</Button>
														)}
													</div>
													<div className="min-w-0">
														<div className="flex flex-wrap items-center gap-2">
															<span className="font-semibold text-sm md:text-base">
																{child.first_name} {child.last_name}
															</span>
															{hasAllergies && (
																<Badge
																	variant="outline"
																	title={child.allergies ?? undefined}
																	className="border-destructive text-destructive gap-1 text-xs max-w-[12rem] truncate">
																	<AlertTriangle
																		aria-hidden="true"
																		className="h-3 w-3"
																	/>
																	<span className="truncate">
																		{child.allergies}
																	</span>
																</Badge>
															)}
															{hasIncidents && (
																<button
																	type="button"
																	onClick={() =>
																		setSelectedIncidents(child.incidents)
																	}
																	aria-label={`View ${child.incidents.length === 1 ? 'incident' : 'incidents'} for ${child.first_name} ${child.last_name}`}>
																	<Badge
																		variant="destructive"
																		className="gap-1 text-xs whitespace-nowrap cursor-pointer">
																		<ShieldAlert
																			aria-hidden="true"
																			className="h-3 w-3"
																		/>
																		Incident today
																	</Badge>
																</button>
															)}
														</div>
														<div className="text-xs md:text-sm text-muted-foreground truncate">
															{child.household?.name || 'Unknown household'}
															<span className="md:hidden">
																{' '}
																· Grade{' '}
																{normalizeGradeDisplay(child.grade)}
															</span>
														</div>
													</div>
												</div>
											</TableCell>

											<TableCell className="hidden whitespace-nowrap md:table-cell">
												{normalizeGradeDisplay(child.grade)}
											</TableCell>

											<TableCell className="col-start-2 row-start-2 p-0 md:table-cell md:p-4">
												<span
													className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
														isCheckedIn
															? 'bg-brand-aqua/15 text-brand-teal'
															: isElsewhere
																? 'bg-background text-foreground border border-border'
																: 'bg-muted text-muted-foreground'
													}`}>
													<span
														aria-hidden="true"
														className={`h-1.5 w-1.5 rounded-full ${
															isCheckedIn
																? 'bg-brand-teal'
																: isElsewhere
																	? 'bg-foreground/50'
																	: 'bg-muted-foreground/60'
														}`}
													/>
													{formatDoorStatusLabel(rowStatus)}
												</span>
											</TableCell>

											<TableCell className="col-start-3 row-start-2 justify-self-end p-0 text-right md:table-cell md:p-4 print:hidden">
												<div className="flex items-center justify-end gap-1">
													<Popover>
														<PopoverTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8 shrink-0"
																aria-label={`Guardian and contact details for ${child.first_name} ${child.last_name}`}>
																<Info aria-hidden="true" className="h-4 w-4" />
															</Button>
														</PopoverTrigger>
														<PopoverContent className="w-80 text-left" align="end">
															<ChildDoorInfo child={child} />
														</PopoverContent>
													</Popover>

													{isCheckedIn ? (
														<Button
															variant="outline"
															size="sm"
															onClick={() => setChildToCheckout(child)}>
															Check out
														</Button>
													) : (
														// Checked in elsewhere: the check-out path deliberately
														// is not offered, because this door cannot release a
														// child from another event's roster. Check in is
														// disabled rather than hidden so the row still reads as
														// an action that is unavailable, with the status chip
														// naming the event holding them.
														<Button
															variant="door"
															size="sm"
															disabled={isElsewhere}
															title={
																isElsewhere
																	? `Checked in to ${getEventName(rowStatus.elsewhereEventId)} — check out there first`
																	: undefined
															}
															onClick={() => handleCheckIn(child.child_id)}>
															Check in
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Sticky confirm dock (item 6) */}
			{selectedCount > 0 && (
				<div
					role="region"
					aria-label="Check-in selection"
					className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-3 md:p-4 z-50 print:hidden">
					<div className="max-w-(--breakpoint-xl) mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 md:gap-4">
						<div className="flex items-center justify-between md:justify-start gap-2 md:gap-4 min-w-0">
							<span className="font-semibold text-sm md:text-base whitespace-nowrap">
								{selectedCount} {selectedCount === 1 ? 'child' : 'children'} selected
							</span>
							{householdSummary && (
								<span className="text-xs md:text-sm text-muted-foreground truncate">
									{householdSummary}
								</span>
							)}
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSelectedChildIds(new Set())}
								className="text-xs md:text-sm">
								Clear
							</Button>
						</div>
						<Button
							variant="door"
							size="lg"
							onClick={handleCheckInSelected}
							disabled={!canCheckIn}
							className="w-full md:w-auto md:min-w-[200px]">
							Confirm check-in · {selectedCount}
						</Button>
					</div>
				</div>
			)}

			{/* Change event (item 4) — same options and behaviour as the legacy screen */}
			<Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Event</DialogTitle>
						<DialogDescription>
							Select the event you want to manage check-ins for.
						</DialogDescription>
					</DialogHeader>
					<RadioGroup
						value={selectedEvent}
						onValueChange={(value) => {
							setSelectedEvent(value);
							setIsEventDialogOpen(false);
						}}
						className="space-y-2">
						{EVENT_OPTIONS.map((event) => (
							<Label
								key={event.id}
								htmlFor={`gathersystem-event-${event.id}`}
								className="flex items-center gap-4 p-4 border rounded-md cursor-pointer hover:bg-muted/50 has-[input:checked]:bg-muted has-[input:checked]:border-primary">
								<RadioGroupItem
									value={event.id}
									id={`gathersystem-event-${event.id}`}
								/>
								<span>{event.name}</span>
							</Label>
						))}
					</RadioGroup>
				</DialogContent>
			</Dialog>

			<CheckoutDialog
				child={childToCheckout}
				onClose={() => setChildToCheckout(null)}
				onCheckout={(childId, attendanceId, verifier) =>
					handleCheckOut(childId, attendanceId, verifier)
				}
			/>

			<IncidentDetailsDialog
				incidents={selectedIncidents}
				onClose={() => setSelectedIncidents(null)}
			/>

			<PhotoCaptureDialog
				child={selectedChildForPhoto}
				onClose={() => setSelectedChildForPhoto(null)}
			/>

			<PhotoViewerDialog
				photo={viewingPhoto}
				onClose={() => setViewingPhoto(null)}
			/>
		</div>
	);
}
