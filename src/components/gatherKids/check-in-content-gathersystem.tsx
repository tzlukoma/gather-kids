'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Users, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
	useGuardians,
	useHouseholds,
	useEmergencyContacts,
	useCheckInMutation,
} from '@/hooks/data';
import { useToast } from '@/hooks/use-toast';
import { parseISO, differenceInYears } from 'date-fns';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { EnrichedChild } from '@/components/gatherKids/check-in-view';
import { useIncidents } from '@/hooks/data';
import { captureAnalyticsEvent } from '@/lib/analytics/browser';
import { getEventName } from '@/lib/constants';

export type StatusFilter = 'all' | 'checkedIn' | 'checkedOut';

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

	const today = getTodayIsoDate();

	// Data hooks
	const { data: children = EMPTY_CHILDREN, isLoading: childrenLoading } = useChildrenForActiveCycle();
	const { data: todaysAttendance = EMPTY_ATTENDANCE, isLoading: attendanceLoading } =
		useAttendance(today);
	const { data: allGuardians = EMPTY_GUARDIANS } = useGuardians();
	const { data: allHouseholds = EMPTY_HOUSEHOLDS } = useHouseholds();
	const { data: allEmergencyContacts = EMPTY_EMERGENCY_CONTACTS } = useEmergencyContacts();
	const { data: todaysIncidents = EMPTY_INCIDENTS, isLoading: incidentsLoading } = useIncidents(today);
	
	const checkInMutation = useCheckInMutation();

	const loading = childrenLoading || attendanceLoading || incidentsLoading;

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

	// Stats
	const checkedInCount = useMemo(() => {
		if (!todaysAttendance) return 0;
		return todaysAttendance.filter((a) => !a.check_out_at).length;
	}, [todaysAttendance]);

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

		if (statusFilter !== 'all') {
			if (statusFilter === 'checkedIn') {
				results = results.filter((child) => child.activeAttendance !== null);
			} else {
				results = results.filter((child) => child.activeAttendance === null);
			}
		}

		return results;
	}, [searchQuery, enrichedChildren, selectedGrades, statusFilter]);

	const handleCheckInSelected = async () => {
		const childrenToCheckIn = Array.from(selectedChildIds)
			.map(id => enrichedChildren.find(c => c.child_id === id))
			.filter(c => c && !c.activeAttendance);

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
						childId: child!.child_id,
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

	if (loading) {
		return <CardGridSkeleton count={8} />;
	}

	const selectedCount = selectedChildIds.size;
	const canCheckIn = Array.from(selectedChildIds).some(id => {
		const child = enrichedChildren.find(c => c.child_id === id);
		return child && !child.activeAttendance;
	});

	return (
		<div className="flex flex-col gap-4 md:gap-6 pb-24">
			{/* Header with Stats */}
			<div className="flex flex-col gap-3 md:gap-4">
				<div className="flex items-center justify-between gap-4">
					<h1 className="text-xl md:text-2xl font-bold font-headline">Door Check-In</h1>
					<div className="text-right">
						<div className="text-2xl md:text-3xl font-bold text-brand-teal">{checkedInCount}</div>
						<div className="text-xs md:text-sm text-muted-foreground">checked in today</div>
					</div>
				</div>

				{/* Search */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 md:h-5 w-4 md:w-5 text-muted-foreground" />
					<Input
						id="gathersystem-search"
						placeholder='Search children (press "/" to focus)...'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9 md:pl-10 h-10 md:h-12 text-sm md:text-base"
					/>
					{searchQuery && (
						<button
							onClick={() => setSearchQuery('')}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
							<X className="h-4 md:h-5 w-4 md:w-5" />
						</button>
					)}
				</div>

				{/* Grade Chips */}
				<div className="flex flex-wrap gap-2 items-center">
					<span className="text-xs md:text-sm font-semibold text-muted-foreground">Grades:</span>
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

				{/* Stats bar */}
				<div className="flex gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
					<span>{filteredChildren.length} children</span>
					{selectedCount > 0 && (
						<span className="font-semibold text-foreground">{selectedCount} selected</span>
					)}
				</div>
			</div>

			{/* Children List (Multi-select rows) */}
			<Card>
				<CardContent className="p-0">
					{filteredChildren.length === 0 ? (
						<div className="p-6 md:p-8 text-center text-muted-foreground">
							<Users className="h-10 md:h-12 w-10 md:w-12 mx-auto mb-2 opacity-50" />
							<p className="text-sm md:text-base">No children match your filters.</p>
						</div>
					) : (
						<div className="divide-y">
							{filteredChildren.map((child) => {
								const isCheckedIn = !!child.activeAttendance;
								const isSelected = selectedChildIds.has(child.child_id);
								const hasAllergies = child.allergies && child.allergies.toLowerCase() !== 'none';
								const hasIncidents = child.incidents.length > 0;

								return (
									<div
										key={child.child_id}
										onClick={() => !isCheckedIn && toggleChildSelection(child.child_id)}
										className={`
											flex items-center gap-2 md:gap-4 p-3 md:p-4 cursor-pointer transition-colors
											${isCheckedIn ? 'bg-muted/30 cursor-not-allowed opacity-60' : 'hover:bg-muted/50'}
											${isSelected && !isCheckedIn ? 'bg-brand-teal/10' : ''}
										`}>
										<Checkbox
											checked={isSelected}
											disabled={isCheckedIn}
											onCheckedChange={() => toggleChildSelection(child.child_id)}
											onClick={(e) => e.stopPropagation()}
										/>
										
										{/* Photo - 56x56 per product rule */}
										<Avatar className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0">
											<AvatarImage src={child.photo_url} alt={child.first_name} />
											<AvatarFallback className="text-xs font-semibold bg-muted">
												{child.first_name[0]}{child.last_name[0]}
											</AvatarFallback>
										</Avatar>

										{/* Info */}
										<div className="flex-1 min-w-0">
											<div className="font-semibold text-sm md:text-base">
												{child.first_name} {child.last_name}
											</div>
											<div className="text-xs md:text-sm text-muted-foreground truncate">
												{child.household?.name || 'Unknown household'} • Grade {normalizeGradeDisplay(child.grade)}
											</div>
										</div>

										{/* Chips - stack on mobile, inline on desktop */}
										<div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-2 flex-shrink-0">
											{hasAllergies && (
												<Badge variant="outline" className="border-destructive text-destructive gap-1 text-xs whitespace-nowrap">
													<AlertTriangle className="h-3 w-3" />
													<span className="hidden sm:inline">Allergy</span>
													<span className="sm:hidden">!</span>
												</Badge>
											)}
											{hasIncidents && (
												<Badge variant="destructive" className="gap-1 text-xs whitespace-nowrap">
													<ShieldAlert className="h-3 w-3" />
													<span className="hidden sm:inline">Incident</span>
													<span className="sm:hidden">!</span>
												</Badge>
											)}
											{isCheckedIn && (
												<Badge variant="default" className="bg-brand-aqua text-xs whitespace-nowrap">
													<span className="hidden sm:inline">Checked In</span>
													<span className="sm:hidden">✓</span>
												</Badge>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Sticky Confirm Dock - mobile responsive */}
			{selectedCount > 0 && (
				<div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-3 md:p-4 z-50">
					<div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 md:gap-4">
						<div className="flex items-center justify-between md:justify-start gap-2 md:gap-4">
							<span className="font-semibold text-sm md:text-base">
								{selectedCount} {selectedCount === 1 ? 'child' : 'children'} selected
							</span>
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
							Check In
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
