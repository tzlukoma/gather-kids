'use client';
import React, { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, ArrowUpDown, Edit, Camera, Plus, UserPlus } from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';
import {
	getTodayIsoDate,
	recordCheckIn,
	recordCheckOut,
	exportRosterCSV,
	getMinistryRoster,
	queryLeaderProfiles,
	saveLeaderMemberships,
	saveLeaderProfile,
} from '@/lib/dal';
import { useMemo, useState } from 'react';
import type {
	Child,
	Guardian,
	Attendance,
	Household,
	EmergencyContact,
	Ministry,
	Incident,
	LeaderProfile,
	MinistryLeaderMembership,
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
import { AddExistingLeaderDialog } from '@/components/gatherKids/add-existing-leader-dialog';
import { CreateNewLeaderDialog } from '@/components/gatherKids/create-new-leader-dialog';
import { EditLeaderMembershipDialog } from '@/components/gatherKids/edit-leader-membership-dialog';
import { v4 as uuidv4 } from 'uuid';

export interface RosterChild extends EnrichedChild {}

type SortDirection = 'asc' | 'desc' | 'none';

const eventOptions = [
	{ id: 'evt_sunday_school', name: 'Sunday School' },
	{ id: 'evt_childrens_church', name: "Children's Church" },
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
	
	// Leader roster state
	const [activeTab, setActiveTab] = useState<'children' | 'leaders'>('children');
	const [isAddLeaderDialogOpen, setIsAddLeaderDialogOpen] = useState(false);
	const [isCreateLeaderDialogOpen, setIsCreateLeaderDialogOpen] = useState(false);
	const [selectedLeaderForEdit, setSelectedLeaderForEdit] = useState<{
		membership: MinistryLeaderMembership & { profile: LeaderProfile };
		ministryId: string;
	} | null>(null);

	const allMinistryEnrollments = useLiveQuery(
		() => db.ministry_enrollments.where({ cycle_id: '2025' }).toArray(),
		[]
	);

	const allChildrenQuery = useLiveQuery(async () => {
		if (user?.metadata?.role === AuthRole.MINISTRY_LEADER) {
			if (
				!user.is_active ||
				!user.assignedMinistryIds ||
				user.assignedMinistryIds.length === 0
			)
				return [];
			const enrollments = await db.ministry_enrollments
				.where('ministry_id')
				.anyOf(user.assignedMinistryIds)
				.and((e) => e.cycle_id === '2025')
				.toArray();
			const childIds = [...new Set(enrollments.map((e) => e.child_id))];
			if (childIds.length === 0) return [];
			return db.children.where('child_id').anyOf(childIds).toArray();
		}
		return db.children.toArray();
	}, [user]);

	const todaysAttendance = useLiveQuery(
		() => db.attendance.where({ date: today }).toArray(),
		[today]
	);
	const todaysIncidents = useLiveQuery(
		() => db.incidents.filter((i) => i.timestamp.startsWith(today)).toArray(),
		[today]
	);

	const allGuardians = useLiveQuery(() => db.guardians.toArray(), []);
	const allHouseholds = useLiveQuery(() => db.households.toArray(), []);
	const allEmergencyContacts = useLiveQuery(
		() => db.emergency_contacts.toArray(),
		[]
	);
	const allMinistries = useLiveQuery(() => db.ministries.toArray(), []);

	// Leader roster data
	const ministryRoster = useLiveQuery(
		() => selectedMinistryFilter === 'all' ? Promise.resolve([]) : getMinistryRoster(selectedMinistryFilter),
		[selectedMinistryFilter]
	);
	
	const allLeaderProfiles = useLiveQuery(() => queryLeaderProfiles(), []);

	const currentEventName = useMemo(() => {
		return (
			eventOptions.find((e) => e.id === selectedEvent)?.name || 'Select Event'
		);
	}, [selectedEvent]);

	useEffect(() => {
		if (!loading && user) {
			if (
				user.metadata.role === AuthRole.MINISTRY_LEADER &&
				(!user.is_active ||
					!user.assignedMinistryIds ||
					user.assignedMinistryIds.length === 0)
			) {
				router.push('/dashboard/incidents');
			} else {
				setIsAuthorized(true);
			}
		}
	}, [user, loading, router]);

	useEffect(() => {
		const statusParam = searchParams.get('status');
		if (statusParam === 'checkedIn') {
			setShowCheckedIn(true);
			setShowCheckedOut(false);
		}
	}, [searchParams]);

	useEffect(() => {
		if (
			user?.metadata?.role === AuthRole.MINISTRY_LEADER &&
			user.assignedMinistryIds?.length === 1
		) {
			setSelectedMinistryFilter(user.assignedMinistryIds[0]);
		}
	}, [user]);

	const childrenWithDetails: RosterChild[] = useMemo(() => {
		if (
			!allChildrenQuery ||
			!todaysAttendance ||
			!allGuardians ||
			!allHouseholds ||
			!allEmergencyContacts ||
			!todaysIncidents
		)
			return [];

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

		return allChildrenQuery.map((child) => ({
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
		allChildrenQuery,
		todaysAttendance,
		allGuardians,
		allHouseholds,
		allEmergencyContacts,
		todaysIncidents,
	]);

	const ministryFilterOptions = useMemo(() => {
		if (!allChildrenQuery || !allMinistryEnrollments || !allMinistries)
			return [];

		let relevantMinistryIds: Set<string>;

		if (
			user?.metadata?.role === AuthRole.MINISTRY_LEADER &&
			user.assignedMinistryIds
		) {
			relevantMinistryIds = new Set(user.assignedMinistryIds);
		} else {
			const childIdsInView = new Set(allChildrenQuery.map((c) => c.child_id));
			relevantMinistryIds = new Set(
				allMinistryEnrollments
					.filter((e) => childIdsInView.has(e.child_id))
					.map((e) => e.ministry_id)
			);
		}

		return allMinistries
			.filter((m) => relevantMinistryIds.has(m.ministry_id))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [allChildrenQuery, allMinistryEnrollments, allMinistries, user]);

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

	// Leader management functions
	const handleAddExistingLeader = async (leaderId: string, roleType: 'PRIMARY' | 'VOLUNTEER') => {
		if (selectedMinistryFilter === 'all') return;
		
		try {
			const existingMemberships = await db.ministry_leader_memberships
				.where('leader_id').equals(leaderId).toArray();
			
			const newMembership: Omit<MinistryLeaderMembership, 'membership_id' | 'created_at' | 'updated_at'> = {
				ministry_id: selectedMinistryFilter,
				leader_id: leaderId,
				role_type: roleType,
				is_active: true,
				notes: undefined,
			};
			
			await saveLeaderMemberships(leaderId, [...existingMemberships, newMembership]);
			
			toast({
				title: 'Leader Added',
				description: 'Leader has been added to the ministry successfully.',
			});
		} catch (error) {
			console.error('Failed to add leader to ministry', error);
			toast({
				title: 'Add Failed',
				description: 'Could not add leader to ministry. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const handleCreateAndAssignLeader = async (
		profileData: Omit<LeaderProfile, 'leader_id' | 'created_at' | 'updated_at'>,
		roleType: 'PRIMARY' | 'VOLUNTEER'
	) => {
		if (selectedMinistryFilter === 'all') return;
		
		try {
			const leaderId = uuidv4();
			const profileWithId = {
				...profileData,
				leader_id: leaderId,
			};
			
			await saveLeaderProfile(profileWithId);
			
			const membership: Omit<MinistryLeaderMembership, 'membership_id' | 'created_at' | 'updated_at'> = {
				ministry_id: selectedMinistryFilter,
				leader_id: leaderId,
				role_type: roleType,
				is_active: true,
				notes: undefined,
			};
			
			await saveLeaderMemberships(leaderId, [membership]);
			
			toast({
				title: 'Leader Created',
				description: 'New leader profile created and assigned to ministry.',
			});
		} catch (error) {
			console.error('Failed to create and assign leader', error);
			toast({
				title: 'Creation Failed',
				description: 'Could not create leader profile. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const handleUpdateLeaderMembership = async (
		membershipId: string,
		updates: { role_type?: 'PRIMARY' | 'VOLUNTEER'; is_active?: boolean; notes?: string }
	) => {
		try {
			await db.ministry_leader_memberships.update(membershipId, {
				...updates,
				updated_at: new Date().toISOString(),
			});
			
			toast({
				title: 'Membership Updated',
				description: 'Leader membership has been updated successfully.',
			});
		} catch (error) {
			console.error('Failed to update membership', error);
			toast({
				title: 'Update Failed',
				description: 'Could not update membership. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const handleRemoveLeaderMembership = async (membershipId: string) => {
		try {
			await db.ministry_leader_memberships.delete(membershipId);
			
			toast({
				title: 'Leader Removed',
				description: 'Leader has been removed from the ministry.',
			});
		} catch (error) {
			console.error('Failed to remove leader membership', error);
			toast({
				title: 'Remove Failed',
				description: 'Could not remove leader from ministry. Please try again.',
				variant: 'destructive',
			});
		}
	};

	if (loading || !isAuthorized || !childrenWithDetails) {
		return <div>Loading rosters...</div>;
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
									<Badge className="bg-green-500 hover:bg-green-600">
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
												<Badge className="bg-green-500 hover:bg-green-600">
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
					/>
				))}
			{displayChildren.length === 0 && (
				<div className="text-center h-24 py-10 text-muted-foreground">
					No children match the current filter.
				</div>
			)}
		</div>
	);

	const renderLeaderTable = () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Phone</TableHead>
					<TableHead>Role</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{ministryRoster && ministryRoster.map((membership) => (
					<TableRow key={membership.membership_id}>
						<TableCell className="font-medium">
							{membership.profile?.first_name} {membership.profile?.last_name}
						</TableCell>
						<TableCell>{membership.profile?.email || '—'}</TableCell>
						<TableCell>{membership.profile?.phone || '—'}</TableCell>
						<TableCell>
							<Badge variant={membership.role_type === 'PRIMARY' ? 'default' : 'secondary'}>
								{membership.role_type}
							</Badge>
						</TableCell>
						<TableCell>
							<Badge
								variant={membership.is_active && membership.profile?.is_active ? 'default' : 'secondary'}
								className={membership.is_active && membership.profile?.is_active ? 'bg-green-500' : ''}>
								{membership.is_active && membership.profile?.is_active ? 'Active' : 'Inactive'}
							</Badge>
						</TableCell>
						<TableCell>
							{user?.metadata?.role === AuthRole.ADMIN && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setSelectedLeaderForEdit({
										membership: membership as MinistryLeaderMembership & { profile: LeaderProfile },
										ministryId: selectedMinistryFilter
									})}>
									Edit
								</Button>
							)}
						</TableCell>
					</TableRow>
				))}
				{(!ministryRoster || ministryRoster.length === 0) && (
					<TableRow>
						<TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
							{selectedMinistryFilter === 'all' ? 
								'Please select a specific ministry to view its leaders.' :
								'No leaders assigned to this ministry.'}
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);

	return (
		<>
			<div className="flex flex-col gap-8">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h1 className="text-xl font-bold font-headline text-muted-foreground">
							Ministry Rosters
						</h1>
						{activeTab === 'children' && (
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
						)}
						{activeTab === 'leaders' && (
							<h2 className="text-3xl font-bold font-headline">
								Ministry Leaders
							</h2>
						)}
					</div>
				</div>

				<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'children' | 'leaders')}>
					<TabsList className="grid w-[200px] grid-cols-2">
						<TabsTrigger value="children">Children</TabsTrigger>
						<TabsTrigger value="leaders">Leaders</TabsTrigger>
					</TabsList>
					
					<TabsContent value="children">
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
					</TabsContent>
					
					<TabsContent value="leaders">
						<Card>
							<CardHeader className="p-0">
								<div className="p-6 bg-muted/25 border-b">
									<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
										<div>
											<CardTitle className="font-headline">Ministry Leaders</CardTitle>
											<CardDescription>
												View and manage leaders assigned to ministries.
											</CardDescription>
										</div>
										{user?.metadata?.role === AuthRole.ADMIN && selectedMinistryFilter !== 'all' && (
											<div className="flex gap-2">
												<Button 
													variant="outline" 
													onClick={() => setIsAddLeaderDialogOpen(true)}
													className="flex items-center gap-2">
													<Plus className="h-4 w-4" />
													Add Existing
												</Button>
												<Button 
													onClick={() => setIsCreateLeaderDialogOpen(true)}
													className="flex items-center gap-2">
													<UserPlus className="h-4 w-4" />
													Create New
												</Button>
											</div>
										)}
									</div>
								</div>
								<div className="p-6 space-y-4">
									<div className="flex items-center">
										<Select
											value={selectedMinistryFilter}
											onValueChange={setSelectedMinistryFilter}>
											<SelectTrigger className="w-full sm:w-[250px]">
												<SelectValue placeholder="Select Ministry" />
											</SelectTrigger>
											<SelectContent>
												{user?.metadata?.role === AuthRole.ADMIN && (
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
							</CardHeader>
							<CardContent>
								{renderLeaderTable()}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
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
			
			<AddExistingLeaderDialog
				open={isAddLeaderDialogOpen}
				onOpenChange={setIsAddLeaderDialogOpen}
				allLeaders={allLeaderProfiles || []}
				existingLeaderIds={ministryRoster?.map(m => m.leader_id) || []}
				onAddLeader={handleAddExistingLeader}
				ministryName={
					ministryFilterOptions.find(m => m.ministry_id === selectedMinistryFilter)?.name || 'Ministry'
				}
			/>
			
			<CreateNewLeaderDialog
				open={isCreateLeaderDialogOpen}
				onOpenChange={setIsCreateLeaderDialogOpen}
				onCreateLeader={handleCreateAndAssignLeader}
				ministryName={
					ministryFilterOptions.find(m => m.ministry_id === selectedMinistryFilter)?.name || 'Ministry'
				}
			/>
			
			<EditLeaderMembershipDialog
				open={!!selectedLeaderForEdit}
				onOpenChange={(open) => !open && setSelectedLeaderForEdit(null)}
				membership={selectedLeaderForEdit?.membership || null}
				ministryName={
					ministryFilterOptions.find(m => m.ministry_id === selectedLeaderForEdit?.ministryId)?.name || 'Ministry'
				}
				onUpdateMembership={handleUpdateLeaderMembership}
				onRemoveMembership={handleRemoveLeaderMembership}
			/>
		</>
	);
}
