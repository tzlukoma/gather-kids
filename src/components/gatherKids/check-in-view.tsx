'use client';

import { useState, useMemo } from 'react';
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
import { getTodayIsoDate } from '@/lib/dal';
import { useIncidents } from '@/hooks/data';
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';
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
import {
	useGuardians,
	useHouseholds,
	useEmergencyContacts,
	useCheckInMutation,
	useCheckOutMutation,
} from '@/hooks/data';
import { getEventName } from '@/lib/constants';

interface CheckInViewProps {
	children: Child[];
	todaysAttendance: Attendance[];
	selectedEvent: string;
	selectedGrades: string[];
	statusFilter: StatusFilter;
}

// Module-level constants to avoid new references on every render (PERF-13)
const EMPTY_GUARDIANS: Guardian[] = [];
const EMPTY_HOUSEHOLDS: Household[] = [];
const EMPTY_EMERGENCY_CONTACTS: EmergencyContact[] = [];
const EMPTY_INCIDENTS: Incident[] = [];

export type EnrichedChild = Child & {
	activeAttendance: Attendance | null;
	guardians: Guardian[];
	household: Household | null;
	emergencyContact: EmergencyContact | null;
	incidents: Incident[];
	age: number | null;
};

export function CheckInView({
	children,
	todaysAttendance,
	selectedEvent,
	selectedGrades,
	statusFilter,
}: CheckInViewProps) {
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

	// Use React Query hooks for additional data
	const { data: allGuardians = EMPTY_GUARDIANS } = useGuardians();
	const { data: allHouseholds = EMPTY_HOUSEHOLDS } = useHouseholds();
	const { data: allEmergencyContacts = EMPTY_EMERGENCY_CONTACTS } = useEmergencyContacts();

	// Use React Query mutations for check-in/check-out
	const checkInMutation = useCheckInMutation();
	const checkOutMutation = useCheckOutMutation();

	const today = getTodayIsoDate();

	// Use React Query hook for incidents data
	const { data: todaysIncidents = EMPTY_INCIDENTS, isLoading: incidentsLoading } = useIncidents(today);

	// Enrich children with additional data (PERF-11: useMemo replaces useState+useEffect)
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

		const incidentsByChild = new Map<string, Incident[]>();
		todaysIncidents.forEach((i) => {
			if (!incidentsByChild.has(i.child_id)) {
				incidentsByChild.set(i.child_id, []);
			}
			incidentsByChild.get(i.child_id)!.push(i);
		});

		const householdIds = children.map((c) => c.household_id);

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

	const handleCheckIn = async (childId: string) => {
		try {
			await checkInMutation.mutateAsync({
				childId,
				eventId: selectedEvent,
				userId: 'user_admin',
			});

			const child = enrichedChildren.find((c) => c.child_id === childId);

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
					e?.message || 'Failed to check in child. Please try again.',
			});
		}
	};

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

			const child = enrichedChildren.find((c) => c.child_id === childId);

			toast({
				title: 'Checked Out',
				description: `${child?.first_name} ${child?.last_name} has been checked out successfully.`,
			});

			// enrichedChildren is derived via useMemo from React Query cache;
			// the mutation already invalidates the attendance cache so the UI will
			// re-derive the updated state automatically.
		} catch (e: any) {
			console.error(e);
			toast({
				title: 'Check-out Failed',
				description:
					e?.message || 'Failed to check out child. Please try again.',
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
	}, [searchQuery, enrichedChildren, selectedGrades, statusFilter]);

	// Show loading skeleton while incidents are loading
	if (incidentsLoading) {
		return <CardGridSkeleton count={8} />;
	}

	return (
		<>
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
				<Input
					placeholder="Search children..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-10"
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
						{searchQuery || selectedGrades.length > 0 || statusFilter !== 'all'
							? 'No children match your current filters.'
							: 'No children found.'}
					</p>
				</div>
			)}

			{/* Dialogs */}
			<CheckoutDialog
				child={childToCheckout}
				onClose={closeCheckoutDialog}
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
		</>
	);
}
