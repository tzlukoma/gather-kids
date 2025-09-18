'use client';

'use client';

import { useState, useMemo, useEffect } from 'react';
import type {
	Child,
	Guardian,
	Attendance,
	Household,
	EmergencyContact,
	Incident,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
	getTodayIsoDate,
	recordCheckIn,
	recordCheckOut,
	getAttendanceForDate,
	getIncidentsForDate,
	getAllGuardians,
	getAllHouseholds,
	getAllEmergencyContacts,
} from '@/lib/dal';
import type { StatusFilter } from '@/app/dashboard/check-in/page';
import { IncidentDetailsDialog } from './incident-details-dialog';
import { PhotoCaptureDialog } from './photo-capture-dialog';
import { PhotoViewerDialog } from './photo-viewer-dialog';
import { parseISO, differenceInYears } from 'date-fns';
import { ChildCard } from './child-card';
import { CheckoutDialog } from './checkout-dialog';
import { normalizeGradeDisplay } from '@/lib/gradeUtils';
import { useAuth } from '@/contexts/auth-context';
import { canUpdateChildPhoto } from '@/lib/permissions';

interface CheckInViewProps {
	initialChildren: Child[];
	selectedEvent: string;
	selectedGrades: string[];
	statusFilter: StatusFilter;
}

const eventNames: { [key: string]: string } = {
	evt_sunday_school: 'Sunday School',
	evt_childrens_church: 'Children&apos;s Church',
	evt_teen_church: 'Teen Church',
	min_choir_kids: 'Children&apos;s Choir Practice',
	min_youth_group: 'Youth Group',
};

const getEventName = (eventId: string | null) => {
	if (!eventId) return '';
	return eventNames[eventId] || 'an event';
};

export interface EnrichedChild extends Child {
	activeAttendance: Attendance | null;
	guardians: Guardian[];
	household: Household | null;
	emergencyContact: EmergencyContact | null;
	incidents: Incident[];
	age: number | null;
}

export function CheckInView({
	initialChildren,
	selectedEvent,
	selectedGrades,
	statusFilter,
}: CheckInViewProps) {
	const [children, setChildren] = useState<EnrichedChild[]>([]);
	const [childToCheckout, setChildToCheckout] = useState<EnrichedChild | null>(
		null
	);
	const [searchQuery, setSearchQuery] = useState('');
	const { toast } = useToast();
	const { user } = useAuth();
	const [selectedIncidents, setSelectedIncidents] = useState<Incident[] | null>(
		null
	);
	const [selectedChildForPhoto, setSelectedChildForPhoto] =
		useState<Child | null>(null);
	const [viewingPhoto, setViewingPhoto] = useState<{
		name: string;
		url: string;
	} | null>(null);

	// State for attendance and incidents data
	const [todaysAttendance, setTodaysAttendance] = useState<Attendance[]>([]);
	const [todaysIncidents, setTodaysIncidents] = useState<Incident[]>([]);
	const [enrichedDataLoading, setEnrichedDataLoading] = useState(true);

	const today = getTodayIsoDate();

	// Load attendance and incidents data using DAL functions
	useEffect(() => {
		const loadAttendanceAndIncidents = async () => {
			try {
				setEnrichedDataLoading(true);
				const [attendanceData, incidentsData] = await Promise.all([
					getAttendanceForDate(today),
					getIncidentsForDate(today),
				]);
				setTodaysAttendance(attendanceData);
				setTodaysIncidents(incidentsData);
			} catch (error) {
				console.error('Error loading attendance and incidents:', error);
				setTodaysAttendance([]);
				setTodaysIncidents([]);
			} finally {
				setEnrichedDataLoading(false);
			}
		};

		loadAttendanceAndIncidents();
	}, [today]);

	useEffect(() => {
		const enrichChildren = async () => {
			if (!todaysAttendance || !todaysIncidents || enrichedDataLoading) return;

			const attendanceByChild = new Map<string, Attendance[]>();
			todaysAttendance.forEach((a) => {
				if (!attendanceByChild.has(a.child_id)) {
					attendanceByChild.set(a.child_id, []);
				}
				attendanceByChild.get(a.child_id)!.push(a);
			});

			const incidentsByChild = new Map<string, Incident[]>();
			todaysIncidents.forEach((i) => {
				if (!incidentsByChild.has(i.child_id)) {
					incidentsByChild.set(i.child_id, []);
				}
				incidentsByChild.get(i.child_id)!.push(i);
			});

			const householdIds = initialChildren.map((c) => c.household_id);
			// Load additional data using DAL functions
			const [allGuardians, allHouseholds, allEmergencyContacts] =
				await Promise.all([
					getAllGuardians(),
					getAllHouseholds(),
					getAllEmergencyContacts(),
				]);

			// Filter to only relevant households for better performance
			const relevantGuardians = allGuardians.filter((g: Guardian) =>
				householdIds.includes(g.household_id)
			);
			const relevantHouseholds = allHouseholds.filter((h: Household) =>
				householdIds.includes(h.household_id)
			);
			const relevantEmergencyContacts = allEmergencyContacts.filter(
				(ec: EmergencyContact) => householdIds.includes(ec.household_id)
			);

			const guardianMap = new Map<string, Guardian[]>();
			relevantGuardians.forEach((g: Guardian) => {
				if (!guardianMap.has(g.household_id)) {
					guardianMap.set(g.household_id, []);
				}
				guardianMap.get(g.household_id)!.push(g);
			});

			const householdMap = new Map<string, Household>();
			relevantHouseholds.forEach((h: Household) => {
				householdMap.set(h.household_id, h);
			});

			const emergencyContactMap = new Map<string, EmergencyContact>();
			relevantEmergencyContacts.forEach((ec: EmergencyContact) => {
				emergencyContactMap.set(ec.household_id, ec);
			});

			const enriched = initialChildren.map((c) => {
				const childAttendance = attendanceByChild.get(c.child_id) || [];
				// Find the most recent check-in that has not been checked out yet.
				const activeAttendance =
					childAttendance
						.filter((a) => !a.check_out_at)
						.sort(
							(a, b) =>
								new Date(b.check_in_at!).getTime() -
								new Date(a.check_in_at!).getTime()
						)[0] || null;

				const childIncidents = (incidentsByChild.get(c.child_id) || []).sort(
					(a, b) =>
						new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				);

				const emergencyContact =
					emergencyContactMap.get(c.household_id) || null;

				return {
					...c,
					activeAttendance: activeAttendance,
					guardians: guardianMap.get(c.household_id) || [],
					household: householdMap.get(c.household_id) || null,
					emergencyContact: emergencyContact,
					incidents: childIncidents,
					age: c.dob ? differenceInYears(new Date(), parseISO(c.dob)) : null,
				};
			});

			setChildren(enriched);
		};
		enrichChildren();
	}, [initialChildren, todaysAttendance, todaysIncidents, enrichedDataLoading]);

	const handleCheckIn = async (childId: string) => {
		try {
			await recordCheckIn(childId, selectedEvent, undefined, 'user_admin');
			const child = children.find((c) => c.child_id === childId);

			// Refresh attendance data to update UI immediately
			const refreshedAttendance = await getAttendanceForDate(today);
			setTodaysAttendance(refreshedAttendance);

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
			await recordCheckOut(attendanceId, verifier);
			const child = children.find((c) => c.child_id === childId);
			// Find the original event name from the attendance record before it gets cleared
			const todaysRecord = todaysAttendance?.find(
				(a) => a.attendance_id === attendanceId
			);
			const eventName = getEventName(todaysRecord?.event_id || null);

			// Refresh attendance data to update UI immediately
			const refreshedAttendance = await getAttendanceForDate(today);
			setTodaysAttendance(refreshedAttendance);

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

	const openCheckoutDialog = (child: EnrichedChild) => {
		setChildToCheckout(child);
	};

	const closeCheckoutDialog = () => {
		setChildToCheckout(null);
	};

	const filteredChildren = useMemo(() => {
		let results = children;

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

		if (selectedGrades.length > 0) {
			results = results.filter(
				(child) =>
					child.grade &&
					selectedGrades.includes(normalizeGradeDisplay(child.grade))
			);
		}

		if (statusFilter !== 'all') {
			if (statusFilter === 'checkedIn') {
				results = results.filter((child) => child.activeAttendance !== null);
			} else {
				// 'checkedOut'
				results = results.filter((child) => child.activeAttendance === null);
			}
		}

		return results;
	}, [searchQuery, children, selectedGrades, statusFilter]);

	return (
		<>
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Search by name or family name (e.g. Jackson)..."
					className="w-full pl-10"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{filteredChildren.map((child) => (
					<ChildCard
						key={child.child_id}
						child={child}
						selectedEvent={selectedEvent}
						onCheckIn={handleCheckIn}
						onCheckout={openCheckoutDialog}
						onViewIncidents={setSelectedIncidents}
						onUpdatePhoto={setSelectedChildForPhoto}
						onViewPhoto={setViewingPhoto}
						canUpdatePhoto={canUpdateChildPhoto(user, child)}
					/>
				))}
			</div>
			{filteredChildren.length === 0 && (
				<div className="text-center col-span-full py-12">
					<p className="text-muted-foreground">
						No children found matching your search or filters.
					</p>
				</div>
			)}
			<CheckoutDialog
				child={childToCheckout}
				onClose={closeCheckoutDialog}
				onCheckout={handleCheckout}
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
		</>
	);
}
