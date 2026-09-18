'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Printer, Search, ShieldAlert, Users, X } from 'lucide-react';
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
import { useIncidents } from '@/hooks/data';
import { captureAnalyticsEvent } from '@/lib/analytics/browser';
import { getEventName } from '@/lib/constants';
import {
	computeDoorStats,
	countDoorStatuses,
	deriveDoorRowStatus,
	formatDoorStatusLabel,
	matchesDoorStatusFilter,
	selectableForCheckIn,
	summarizeSelectedHouseholds,
	type DoorStatusFilter,
} from '@/lib/door-check-in';

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
		() => computeDoorStats(enrichedChildren, todaysIncidents),
		[enrichedChildren, todaysIncidents]
	);
	const statusCounts = useMemo(
		() => countDoorStatuses(enrichedChildren),
		[enrichedChildren]
	);

	const currentEventName = useMemo(
		() => EVENT_OPTIONS.find((e) => e.id === selectedEvent)?.name || 'Select Event',
		[selectedEvent]
	);

	const eyebrow = `${currentEventName} · ${format(new Date(), 'EEE MMM d')}`;

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

		return results.filter((child) => matchesDoorStatusFilter(child, statusFilter));
	}, [searchQuery, enrichedChildren, selectedGrades, statusFilter]);

	/** Rows in view that a bulk check-in would act on (not already on site). */
	const selectableRows = useMemo(
		() => filteredChildren.filter((child) => !child.activeAttendance),
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
						<div className="text-3xl font-bold">{stats.notCheckedIn}</div>
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

				<Tabs
					value={statusFilter}
					onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
					<TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
						<TabsTrigger value="all">All {statusCounts.all}</TabsTrigger>
						<TabsTrigger value="checkedIn">
							Checked in {statusCounts.checkedIn}
						</TabsTrigger>
						<TabsTrigger value="checkedOut">
							Not checked in {statusCounts.notCheckedIn}
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
							<TableHeader>
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
									const rowStatus = deriveDoorRowStatus(child);
									const isCheckedIn = rowStatus.status === 'checkedIn';
									const isSelected = selectedChildIds.has(child.child_id);
									const hasAllergies =
										!!child.allergies &&
										child.allergies.toLowerCase() !== 'none';
									const hasIncidents = child.incidents.length > 0;

									return (
										<TableRow
											key={child.child_id}
											data-state={isSelected ? 'selected' : undefined}
											className={isSelected ? 'bg-brand-teal/10' : undefined}>
											<TableCell className="print:hidden">
												<Checkbox
													checked={isSelected}
													disabled={isCheckedIn}
													onCheckedChange={() =>
														toggleChildSelection(child.child_id)
													}
													aria-label={`Select ${child.first_name} ${child.last_name}`}
												/>
											</TableCell>

											<TableCell>
												<div className="flex items-center gap-3">
													{/* 56×56 photo, radius 0.5rem (item 7) */}
													<Avatar className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-lg">
														<AvatarImage
															src={child.photo_url}
															alt={`${child.first_name} ${child.last_name}`}
														/>
														<AvatarFallback className="rounded-lg text-sm font-semibold bg-muted">
															{child.first_name[0]}
															{child.last_name[0]}
														</AvatarFallback>
													</Avatar>
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
																<Badge
																	variant="destructive"
																	className="gap-1 text-xs whitespace-nowrap">
																	<ShieldAlert
																		aria-hidden="true"
																		className="h-3 w-3"
																	/>
																	Incident today
																</Badge>
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

											<TableCell className="hidden md:table-cell whitespace-nowrap">
												{normalizeGradeDisplay(child.grade)}
											</TableCell>

											<TableCell>
												<span
													className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
														isCheckedIn
															? 'bg-brand-aqua/15 text-brand-teal'
															: 'bg-muted text-muted-foreground'
													}`}>
													<span
														aria-hidden="true"
														className={`h-1.5 w-1.5 rounded-full ${
															isCheckedIn
																? 'bg-brand-teal'
																: 'bg-muted-foreground/60'
														}`}
													/>
													{formatDoorStatusLabel(rowStatus)}
												</span>
											</TableCell>

											<TableCell className="text-right print:hidden">
												{isCheckedIn ? (
													<Button
														variant="outline"
														size="sm"
														onClick={() => setChildToCheckout(child)}>
														Check out
													</Button>
												) : (
													<Button
														variant="door"
														size="sm"
														onClick={() => handleCheckIn(child.child_id)}>
														Check in
													</Button>
												)}
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
		</div>
	);
}
