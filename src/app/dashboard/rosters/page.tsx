'use client';
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AuthRole } from '@/lib/auth-types';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, ArrowUpDown, Edit, Camera } from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';
import {
	getTodayIsoDate,
	recordCheckIn,
	recordCheckOut,
	exportRosterCSV,
	getAllChildren,
	getChildrenForLeader,
	getAttendanceForDate,
	getIncidentsForDate,
	getAllGuardians,
	getAllHouseholds,
	getAllEmergencyContacts,
	getMinistries,
	getMinistryEnrollmentsByCycle,
} from '@/lib/dal';
import { dbAdapter } from '@/lib/db-utils';
import { useMemo } from 'react';
import type {
	Child,
	Guardian,
	Attendance,
	Household,
	EmergencyContact,
	Ministry,
	MinistryEnrollment,
	Incident,
} from '@/lib/types';
import { CheckoutDialog } from '@/components/gatherKids/checkout-dialog';
import { useToast } from '@/hooks/use-toast';
import type { EnrichedChild } from '@/components/gatherKids/check-in-view';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PhotoViewerDialog } from '@/components/gatherKids/photo-viewer-dialog';
import { ChildCard } from '@/components/gatherKids/child-card';
import { IncidentDetailsDialog } from '@/components/gatherKids/incident-details-dialog';
import { PhotoCaptureDialog } from '@/components/gatherKids/photo-capture-dialog';
import { canUpdateChildPhoto } from '@/lib/permissions';

export type RosterChild = EnrichedChild;

type SortDirection = 'asc' | 'desc' | 'none';

const eventOptions = [
	{ id: 'evt_sunday_school', name: 'Sunday School' },
	{ id: 'evt_childrens_church', name: 'Children&apos;s Church' },
	{ id: 'evt_teen_church', name: 'Teen Church' },
];

const getEventName = (eventId: string | null) => {
	if (!eventId) return '';
	const event = eventOptions.find((e) => e.id === eventId);
	return event?.name || 'an event';
};

const gradeSortOrder: { [key: string]: number } = {
	'Pre-K': 0,
	Kindergarten: 1,
	'1st Grade': 2,
	'2nd Grade': 3,
	'3rd Grade': 4,
	'4th Grade': 5,
	'5th Grade': 6,
	'6th Grade': 7,
	'7th Grade': 8,
	'8th Grade': 9,
	'9th Grade': 10,
	'10th Grade': 11,
	'11th Grade': 12,
	'12th Grade': 13,
};

const getGradeValue = (grade?: string): number => {
	if (!grade) return 99;
	const value = gradeSortOrder[grade];
	return value !== undefined ? value : 99;
};

export default function RostersPage() {
	const today = getTodayIsoDate();
	const { toast } = useToast();
	const isMobile = useIsMobile();
	const searchParams = useSearchParams();
	const { user, loading } = useAuth();
	const router = useRouter();
	const [isAuthorized, setIsAuthorized] = useState(false);

	const [selectedEvent, setSelectedEvent] = useState('evt_sunday_school');
	const [childToCheckout, setChildToCheckout] = useState<RosterChild | null>(
		null
	);
	const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
	const [viewingPhoto, setViewingPhoto] = useState<{
		name: string;
		url: string;
	} | null>(null);

	const [showCheckedIn, setShowCheckedIn] = useState(false);
	const [showCheckedOut, setShowCheckedOut] = useState(false);
	const [groupByGrade, setGroupByGrade] = useState(false);

	const [selectedChildren, setSelectedChildren] = useState<Set<string>>(
		new Set()
	);

	const [gradeSort, setGradeSort] = useState<SortDirection>('asc');
	const [selectedMinistryFilter, setSelectedMinistryFilter] =
		useState<string>('all');

	const [selectedIncidents, setSelectedIncidents] = useState<Incident[] | null>(
		null
	);
	const [selectedChildForPhoto, setSelectedChildForPhoto] =
		useState<Child | null>(null);

	// State management for data loading
	const [allMinistryEnrollments, setAllMinistryEnrollments] = useState<
		MinistryEnrollment[]
	>([]);
	const [allChildren, setAllChildren] = useState<Child[]>([]);
	const [todaysAttendance, setTodaysAttendance] = useState<Attendance[]>([]);
	const [todaysIncidents, setTodaysIncidents] = useState<Incident[]>([]);
	const [allGuardians, setAllGuardians] = useState<Guardian[]>([]);
	const [allHouseholds, setAllHouseholds] = useState<Household[]>([]);
	const [allEmergencyContacts, setAllEmergencyContacts] = useState<
		EmergencyContact[]
	>([]);
	const [allMinistries, setAllMinistries] = useState<Ministry[]>([]);
	const [dataLoading, setDataLoading] = useState(true);
	const [leaderMinistryId, setLeaderMinistryId] = useState<string | null>(null);
	const [noMinistryAssigned, setNoMinistryAssigned] = useState(false);

	// Load data using DAL functions
	useEffect(() => {
		const loadData = async () => {
			if (!user) return;

			try {
				setDataLoading(true);
				const today = getTodayIsoDate();

				// Get the active registration cycle
				const cycles = await dbAdapter.listRegistrationCycles();
				const activeCycle = cycles.find(
					(cycle) => cycle.is_active === true || Number(cycle.is_active) === 1
				);

				if (!activeCycle) {
					console.warn('⚠️ RostersPage: No active registration cycle found');
					return;
				}

				console.log('🔍 RostersPage: Using active cycle', activeCycle.cycle_id);

				// Load children based on user role
				let childrenData: Child[] = [];
				if (user?.metadata?.role === AuthRole.MINISTRY_LEADER && user.email) {
					console.log(
						'🔍 RostersPage: Finding ministry for leader email',
						user.email
					);

					// Get all ministry accounts to find which ministry this email belongs to
					const ministryAccounts = await dbAdapter.listMinistryAccounts();
					const matchingAccount = ministryAccounts.find(
						(account) =>
							account.email.toLowerCase() === user.email.toLowerCase()
					);

					if (matchingAccount) {
						console.log('🔍 RostersPage: Found matching ministry account', {
							ministryId: matchingAccount.ministry_id,
							displayName: matchingAccount.display_name,
						});
						childrenData = await getChildrenForLeader(
							[matchingAccount.ministry_id],
							activeCycle.cycle_id
						);
						setLeaderMinistryId(matchingAccount.ministry_id);
					} else {
						console.warn(
							'⚠️ RostersPage: No ministry account found for leader email',
							user.email
						);
						childrenData = [];
						setLeaderMinistryId(null);
						setNoMinistryAssigned(true);
					}
				} else {
					childrenData = await getAllChildren();
				}

				// Load all other data in parallel
				const [
					enrollments,
					attendance,
					incidents,
					guardians,
					households,
					emergencyContacts,
					ministries,
				] = await Promise.all([
					getMinistryEnrollmentsByCycle(activeCycle.cycle_id),
					getAttendanceForDate(today),
					getIncidentsForDate(today),
					getAllGuardians(),
					getAllHouseholds(),
					getAllEmergencyContacts(),
					getMinistries(true), // Only get active ministries
				]);

				setAllChildren(childrenData);
				setAllMinistryEnrollments(enrollments);
				setTodaysAttendance(attendance);
				setTodaysIncidents(incidents);
				setAllGuardians(guardians);
				setAllHouseholds(households);
				setAllEmergencyContacts(emergencyContacts);
				setAllMinistries(ministries);
			} catch (error) {
				console.error('Error loading roster data:', error);
			} finally {
				setDataLoading(false);
			}
		};

		loadData();
	}, [user]);

	const currentEventName = useMemo(() => {
		return (
			eventOptions.find((e) => e.id === selectedEvent)?.name || 'Select Event'
		);
	}, [selectedEvent]);

	useEffect(() => {
		if (!loading && user) {
			console.log('🔍 RostersPage: Authorization check', {
				userRole: user?.metadata?.role,
				userEmail: user?.email,
				loading,
			});
			// Always authorize ministry leaders - let the empty state handle no ministry assignment
			setIsAuthorized(true);
		}
	}, [user, loading]);

	useEffect(() => {
		const statusParam = searchParams.get('status');
		if (statusParam === 'checkedIn') {
			setShowCheckedIn(true);
			setShowCheckedOut(false);
		}
	}, [searchParams]);

	useEffect(() => {
		if (user?.metadata?.role === AuthRole.MINISTRY_LEADER && leaderMinistryId) {
			setSelectedMinistryFilter(leaderMinistryId);
		}
	}, [user, leaderMinistryId]);

	const childrenWithDetails: RosterChild[] = useMemo(() => {
		if (dataLoading) return [];

		const activeAttendance = todaysAttendance.filter((a) => !a.check_out_at);
		const attendanceMap = new Map(activeAttendance.map((a) => [a.child_id, a]));
		const guardianMap = new Map<string, Guardian[]>();
		allGuardians.forEach((g) => {
			if (!guardianMap.has(g.household_id)) guardianMap.set(g.household_id, []);
			guardianMap.get(g.household_id)!.push(g);
		});
		const householdMap = new Map(allHouseholds.map((h) => [h.household_id, h]));
		const emergencyContactMap = new Map(
			allEmergencyContacts.map((ec) => [ec.household_id, ec])
		);

		const incidentsByChild = new Map<string, Incident[]>();
		todaysIncidents.forEach((i) => {
			if (!incidentsByChild.has(i.child_id)) {
				incidentsByChild.set(i.child_id, []);
			}
			incidentsByChild.get(i.child_id)!.push(i);
		});

		return allChildren.map((child) => ({
			...child,
			activeAttendance: attendanceMap.get(child.child_id) || null,
			guardians: guardianMap.get(child.household_id) || [],
			household: householdMap.get(child.household_id) || null,
			emergencyContact: emergencyContactMap.get(child.household_id) || null,
			incidents: (incidentsByChild.get(child.child_id) || []).sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			),
			age: child.dob
				? differenceInYears(new Date(), parseISO(child.dob))
				: null,
		}));
	}, [
		allChildren,
		todaysAttendance,
		allGuardians,
		allHouseholds,
		allEmergencyContacts,
		todaysIncidents,
		dataLoading,
	]);

	const ministryFilterOptions = useMemo(() => {
		if (dataLoading) return [];

		// For ADMIN users, show all ministries
		// For MINISTRY_LEADER users, show only their assigned ministry
		if (user?.metadata?.role === AuthRole.ADMIN) {
			return allMinistries.sort((a, b) => a.name.localeCompare(b.name));
		}

		if (user?.metadata?.role === AuthRole.MINISTRY_LEADER && leaderMinistryId) {
			return allMinistries
				.filter((m) => m.ministry_id === leaderMinistryId)
				.sort((a, b) => a.name.localeCompare(b.name));
		}

		// Fallback: show ministries that have enrollments for loaded children
		const relevantMinistryIds: Set<string> = new Set(
			allMinistryEnrollments
				.filter((e) =>
					new Set(allChildren.map((c) => c.child_id)).has(e.child_id)
				)
				.map((e) => e.ministry_id)
		);

		return allMinistries
			.filter((m) => relevantMinistryIds.has(m.ministry_id))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [
		allChildren,
		allMinistryEnrollments,
		allMinistries,
		user,
		dataLoading,
		leaderMinistryId,
	]);

	const displayChildren = useMemo(() => {
		let filtered = childrenWithDetails;

		if (selectedMinistryFilter !== 'all' && allMinistryEnrollments) {
			const childrenInMinistry = new Set(
				allMinistryEnrollments
					.filter((e) => e.ministry_id === selectedMinistryFilter)
					.map((e) => e.child_id)
			);
			filtered = filtered.filter((c) => childrenInMinistry.has(c.child_id));
		}

		const isFiltered = showCheckedIn !== showCheckedOut;
		if (isFiltered) {
			if (showCheckedIn) {
				filtered = filtered.filter((child) => child.activeAttendance);
			} else {
				// showCheckedOut
				filtered = filtered.filter((child) => !child.activeAttendance);
			}
		}

		if (gradeSort !== 'none') {
			filtered.sort((a, b) => {
				const aVal = getGradeValue(a.grade);
				const bVal = getGradeValue(b.grade);
				if (gradeSort === 'asc') {
					return aVal - bVal;
				} else {
					return bVal - aVal;
				}
			});
		}

		return filtered;
	}, [
		childrenWithDetails,
		showCheckedIn,
		showCheckedOut,
		gradeSort,
		selectedMinistryFilter,
		allMinistryEnrollments,
	]);

	const groupedChildren = useMemo(() => {
		if (!groupByGrade) return null;
		return displayChildren.reduce((acc, child) => {
			const grade = child.grade || 'Ungraded';
			if (!acc[grade]) {
				acc[grade] = [];
			}
			acc[grade].push(child);
			return acc;
		}, {} as Record<string, RosterChild[]>);
	}, [displayChildren, groupByGrade]);

	const handleBulkAction = async () => {
		const promises = [];
		const childrenToUpdate = Array.from(selectedChildren);

		if (showCheckedOut) {
			// Bulk Check-In
			for (const childId of childrenToUpdate) {
				promises.push(
					recordCheckIn(childId, selectedEvent, undefined, 'user_admin_bulk')
				);
			}
			await Promise.all(promises);
			toast({
				title: 'Bulk Check-In Complete',
				description: `${childrenToUpdate.length} children checked in.`,
			});
		} else if (showCheckedIn) {
			// Bulk Check-Out
			for (const childId of childrenToUpdate) {
				const child = displayChildren.find((c) => c.child_id === childId);
				if (child?.activeAttendance) {
					promises.push(
						recordCheckOut(
							child.activeAttendance.attendance_id,
							{ method: 'other', value: 'Admin Bulk Checkout' },
							'user_admin_bulk'
						)
					);
				}
			}
			await Promise.all(promises);
			toast({
				title: 'Bulk Check-Out Complete',
				description: `${childrenToUpdate.length} children checked out.`,
			});
		}

		setSelectedChildren(new Set());
	};

	const toggleSelection = (childId: string) => {
		setSelectedChildren((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(childId)) {
				newSet.delete(childId);
			} else {
				newSet.add(childId);
			}
			return newSet;
		});
	};

	const toggleSelectAll = () => {
		if (selectedChildren.size === displayChildren.length) {
			setSelectedChildren(new Set());
		} else {
			setSelectedChildren(new Set(displayChildren.map((c) => c.child_id)));
		}
	};

	const handleCheckIn = async (childId: string) => {
		try {
			await recordCheckIn(childId, selectedEvent, undefined, user?.id);

			// Refresh attendance data to update UI immediately
			const refreshedAttendance = await getAttendanceForDate(today);
			setTodaysAttendance(refreshedAttendance);

			const child = childrenWithDetails.find((c) => c.child_id === childId);
			toast({
				title: 'Checked In',
				description: `${child?.first_name} ${
					child?.last_name
				} has been checked in to ${getEventName(selectedEvent)}.`,
			});
		} catch (e: any) {
			console.error(e);
			toast({
				title: 'Check-in Failed',
				description:
					e.message || 'Could not check in the child. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const handleCheckout = async (
		childId: string,
		attendanceId: string,
		verifier: { method: 'PIN' | 'other'; value: string }
	) => {
		try {
			await recordCheckOut(attendanceId, verifier, user?.id);

			// Refresh attendance data to update UI immediately
			const refreshedAttendance = await getAttendanceForDate(today);
			setTodaysAttendance(refreshedAttendance);

			const child = childrenWithDetails.find((c) => c.child_id === childId);
			const eventName = getEventName(child?.activeAttendance?.event_id || null);
			toast({
				title: 'Checked Out',
				description: `${child?.first_name} ${child?.last_name} has been checked out from ${eventName}.`,
			});
		} catch (e) {
			console.error(e);
			toast({
				title: 'Check-out Failed',
				description: 'Could not check out the child. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const toggleGradeSort = () => {
		if (gradeSort === 'none') setGradeSort('asc');
		else if (gradeSort === 'asc') setGradeSort('desc');
		else setGradeSort('none');
	};

	const handleExport = async () => {
		const blob = await exportRosterCSV(displayChildren);
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `roster_${today}_${selectedMinistryFilter}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast({
			title: 'Exported',
			description: 'The filtered roster has been downloaded.',
		});
	};

	if (loading || !isAuthorized || dataLoading) {
		return <div>Loading rosters...</div>;
	}

	// Show empty state for ministry leaders without assigned ministry
	if (user?.metadata?.role === AuthRole.MINISTRY_LEADER && noMinistryAssigned) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
				<div className="text-center space-y-2">
					<h2 className="text-2xl font-semibold">No Ministry Assigned</h2>
					<p className="text-muted-foreground max-w-md">
						Your email address ({user.email}) is not currently associated with
						any active ministry. Please contact your administrator to assign you
						to a ministry.
					</p>
				</div>
				<Button variant="outline" onClick={() => window.location.reload()}>
					Refresh Page
				</Button>
			</div>
		);
	}

	const showBulkActions =
		(showCheckedIn && !showCheckedOut) || (!showCheckedIn && showCheckedOut);

	const renderTable = () => (
		<Table>
			<TableHeader>
				<TableRow>
					{showBulkActions && (
						<TableHead className="w-[50px]">
							<Checkbox
								onCheckedChange={toggleSelectAll}
								checked={
									selectedChildren.size > 0 &&
									selectedChildren.size === displayChildren.length
								}
								aria-label="Select all"
							/>
						</TableHead>
					)}
					<TableHead className="w-[50px]">Photo</TableHead>
					<TableHead>Name</TableHead>
					<TableHead>
						<Button variant="ghost" onClick={toggleGradeSort} className="px-1">
							Grade
							<ArrowUpDown className="ml-2 h-4 w-4" />
						</Button>
					</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Check-In Time</TableHead>
					<TableHead>Alerts</TableHead>
					<TableHead>Action</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{!groupedChildren &&
					displayChildren.map((child) => (
						<TableRow
							key={child.child_id}
							data-state={selectedChildren.has(child.child_id) && 'selected'}>
							{showBulkActions && (
								<TableCell>
									<Checkbox
										checked={selectedChildren.has(child.child_id)}
										onCheckedChange={() => toggleSelection(child.child_id)}
										aria-label={`Select ${child.first_name}`}
									/>
								</TableCell>
							)}
							<TableCell>
								{child.photo_url && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() =>
											setViewingPhoto({
												name: `${child.first_name} ${child.last_name}`,
												url: child.photo_url!,
											})
										}>
										<Camera className="h-4 w-4" />
									</Button>
								)}
							</TableCell>
							<TableCell className="font-medium">{`${child.first_name} ${child.last_name}`}</TableCell>
							<TableCell>{child.grade}</TableCell>
							<TableCell>
								{child.activeAttendance ? (
									<Badge className="bg-brand-aqua hover:opacity-90">
										Checked In
									</Badge>
								) : (
									<Badge variant="secondary">Checked Out</Badge>
								)}
							</TableCell>
							<TableCell>
								{child.activeAttendance?.check_in_at
									? format(new Date(child.activeAttendance.check_in_at), 'p')
									: 'N/A'}
							</TableCell>
							<TableCell>
								{child.allergies && (
									<Badge variant="destructive">Allergy</Badge>
								)}
							</TableCell>
							<TableCell className="w-[120px]">
								{child.activeAttendance ? (
									<Button
										variant="outline"
										size="sm"
										className="w-full"
										onClick={() => setChildToCheckout(child)}>
										Check Out
									</Button>
								) : (
									<Button
										size="sm"
										className="w-full"
										onClick={() => handleCheckIn(child.child_id)}>
										Check In
									</Button>
								)}
							</TableCell>
						</TableRow>
					))}
				{groupedChildren &&
					Object.entries(groupedChildren)
						.sort(
							([gradeA], [gradeB]) =>
								getGradeValue(gradeA) - getGradeValue(gradeB)
						)
						.map(([grade, childrenInGrade]) => (
							<React.Fragment key={grade}>
								<TableRow className="bg-muted/50 hover:bg-muted/50">
									<TableCell
										colSpan={showBulkActions ? 8 : 7}
										className="font-bold text-muted-foreground">
										{grade} ({childrenInGrade.length})
									</TableCell>
								</TableRow>
								{childrenInGrade.map((child) => (
									<TableRow
										key={child.child_id}
										data-state={
											selectedChildren.has(child.child_id) && 'selected'
										}>
										{showBulkActions && (
											<TableCell>
												<Checkbox
													checked={selectedChildren.has(child.child_id)}
													onCheckedChange={() =>
														toggleSelection(child.child_id)
													}
													aria-label={`Select ${child.first_name}`}
												/>
											</TableCell>
										)}
										<TableCell>
											{child.photo_url && (
												<Button
													variant="ghost"
													size="icon"
													onClick={() =>
														setViewingPhoto({
															name: `${child.first_name} ${child.last_name}`,
															url: child.photo_url!,
														})
													}>
													<Camera className="h-4 w-4" />
												</Button>
											)}
										</TableCell>
										<TableCell className="font-medium">{`${child.first_name} ${child.last_name}`}</TableCell>
										<TableCell>{child.grade}</TableCell>
										<TableCell>
											{child.activeAttendance ? (
												<Badge className="bg-brand-aqua hover:opacity-90">
													Checked In
												</Badge>
											) : (
												<Badge variant="secondary">Checked Out</Badge>
											)}
										</TableCell>
										<TableCell>
											{child.activeAttendance?.check_in_at
												? format(
														new Date(child.activeAttendance.check_in_at),
														'p'
												  )
												: 'N/A'}
										</TableCell>
										<TableCell>
											{child.allergies && (
												<Badge variant="destructive">Allergy</Badge>
											)}
										</TableCell>
										<TableCell className="w-[120px]">
											{child.activeAttendance ? (
												<Button
													variant="outline"
													size="sm"
													className="w-full"
													onClick={() => setChildToCheckout(child)}>
													Check Out
												</Button>
											) : (
												<Button
													size="sm"
													className="w-full"
													onClick={() => handleCheckIn(child.child_id)}>
													Check In
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</React.Fragment>
						))}
				{displayChildren.length === 0 && (
					<TableRow>
						<TableCell
							colSpan={showBulkActions ? 8 : 7}
							className="text-center h-24 text-muted-foreground">
							No children match the current filter.
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);

	const renderCards = () => (
		<div className="grid grid-cols-1 gap-4">
			{groupedChildren &&
				Object.entries(groupedChildren)
					.sort(
						([gradeA], [gradeB]) =>
							getGradeValue(gradeA) - getGradeValue(gradeB)
					)
					.map(([grade, childrenInGrade]) => (
						<React.Fragment key={grade}>
							<div className="bg-muted/50 p-2 rounded-md">
								<h3 className="font-bold text-muted-foreground">
									{grade} ({childrenInGrade.length})
								</h3>
							</div>
							{childrenInGrade.map((child) => (
								<ChildCard
									key={child.child_id}
									child={child}
									selectedEvent={selectedEvent}
									onCheckIn={handleCheckIn}
									onCheckout={setChildToCheckout}
									onViewIncidents={setSelectedIncidents}
									onUpdatePhoto={setSelectedChildForPhoto}
									onViewPhoto={setViewingPhoto}
									canUpdatePhoto={canUpdateChildPhoto(user, child)}
								/>
							))}
						</React.Fragment>
					))}
			{!groupedChildren &&
				displayChildren.map((child) => (
					<ChildCard
						key={child.child_id}
						child={child}
						selectedEvent={selectedEvent}
						onCheckIn={handleCheckIn}
						onCheckout={setChildToCheckout}
						onViewIncidents={setSelectedIncidents}
						onUpdatePhoto={setSelectedChildForPhoto}
						onViewPhoto={setViewingPhoto}
						canUpdatePhoto={canUpdateChildPhoto(user, child)}
					/>
				))}
			{displayChildren.length === 0 && (
				<div className="text-center h-24 py-10 text-muted-foreground">
					No children match the current filter.
				</div>
			)}
		</div>
	);

	return (
		<>
			<div className="flex flex-col gap-8">
				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-xl font-bold font-headline text-muted-foreground">
								Ministry Rosters
							</h1>
						</div>
						<Dialog
							open={isEventDialogOpen}
							onOpenChange={setIsEventDialogOpen}>
							<DialogTrigger asChild>
								<Button
									variant="link"
									className="text-3xl font-bold font-headline p-0 h-auto">
									Check-in: {currentEventName}
									<Edit className="ml-2 h-5 w-5" />
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Change Check-in Event</DialogTitle>
									<DialogDescription>
										Select the event you want to check children into or out of.
									</DialogDescription>
								</DialogHeader>
								<RadioGroup
									value={selectedEvent}
									onValueChange={(value) => {
										setSelectedEvent(value);
										setIsEventDialogOpen(false);
									}}
									className="space-y-2">
									{eventOptions.map((event) => (
										<Label
											key={event.id}
											htmlFor={event.id}
											className="flex items-center gap-4 p-4 border rounded-md cursor-pointer hover:bg-muted/50 has-[input:checked]:bg-muted has-[input:checked]:border-primary">
											<RadioGroupItem value={event.id} id={event.id} />
											<span>{event.name}</span>
										</Label>
									))}
								</RadioGroup>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				<Card>
					<CardHeader className="p-0">
						<div className="p-6 bg-muted/25 border-b">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
								<div>
									<CardTitle className="font-headline">All Children</CardTitle>
									<CardDescription>
										A complete list of all children registered.
									</CardDescription>
								</div>
								<Button variant="outline" onClick={handleExport}>
									<FileDown className="mr-2 h-4 w-4" />
									Export CSV
								</Button>
							</div>
						</div>
						<div className="p-6 space-y-4">
							<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
								<div className="flex flex-col sm:flex-row items-start sm:items-center gap-x-4 gap-y-2">
									{user?.metadata?.role === AuthRole.ADMIN && (
										<div className="flex items-center space-x-2">
											<Checkbox
												id="group-by-grade"
												checked={groupByGrade}
												onCheckedChange={(checked) =>
													setGroupByGrade(!!checked)
												}
											/>
											<Label htmlFor="group-by-grade">Group by Grade</Label>
										</div>
									)}
									<div className="flex items-center space-x-2">
										<Checkbox
											id="show-checked-in"
											checked={showCheckedIn}
											onCheckedChange={(checked) => setShowCheckedIn(!!checked)}
										/>
										<Label htmlFor="show-checked-in">Checked-In</Label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="show-checked-out"
											checked={showCheckedOut}
											onCheckedChange={(checked) =>
												setShowCheckedOut(!!checked)
											}
										/>
										<Label htmlFor="show-checked-out">Checked-Out</Label>
									</div>
								</div>
								<div className="flex items-center">
									<Select
										value={selectedMinistryFilter}
										onValueChange={setSelectedMinistryFilter}>
										<SelectTrigger className="w-full sm:w-[250px]">
											<SelectValue placeholder="Filter by Ministry" />
										</SelectTrigger>
										<SelectContent>
											{(user?.metadata?.role === AuthRole.ADMIN ||
												(user?.metadata?.role === AuthRole.MINISTRY_LEADER &&
													user.assignedMinistryIds &&
													user.assignedMinistryIds.length > 1)) && (
												<SelectItem value="all">All Ministries</SelectItem>
											)}
											{ministryFilterOptions.map((m) => (
												<SelectItem key={m.ministry_id} value={m.ministry_id}>
													{m.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{showBulkActions && (
							<div className="border-b mb-4 pb-4 flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">
										{selectedChildren.size} children selected
									</p>
									<Button
										variant="link"
										size="sm"
										className="p-0 h-auto"
										onClick={toggleSelectAll}>
										{selectedChildren.size === displayChildren.length
											? 'Deselect All'
											: 'Select All'}
									</Button>
								</div>
								<Button
									onClick={handleBulkAction}
									disabled={selectedChildren.size === 0}>
									{showCheckedOut ? 'Bulk Check-In' : 'Bulk Check-Out'}
								</Button>
							</div>
						)}
						{isMobile ? renderCards() : renderTable()}
					</CardContent>
				</Card>
			</div>
			<CheckoutDialog
				child={childToCheckout}
				onClose={() => setChildToCheckout(null)}
				onCheckout={handleCheckout}
			/>
			<PhotoViewerDialog
				photo={viewingPhoto}
				onClose={() => setViewingPhoto(null)}
			/>
			<IncidentDetailsDialog
				incidents={selectedIncidents}
				onClose={() => setSelectedIncidents(null)}
			/>
			<PhotoCaptureDialog
				child={selectedChildForPhoto}
				onClose={() => setSelectedChildForPhoto(null)}
			/>
		</>
	);
}
