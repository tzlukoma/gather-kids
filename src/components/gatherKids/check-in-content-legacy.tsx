'use client';

import { useState, useMemo } from 'react';
import { CheckInView } from '@/components/gatherKids/check-in-view';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Users, Filter, Edit } from 'lucide-react';
import {
	buildDoorQuery,
	parseDoorStatusFilter,
} from '@/lib/door-check-in';
import { NoCheckInEventsNotice } from '@/components/gatherKids/no-check-in-events-notice';
import {
	doorEventOptions,
	eventPickerLabel,
	onSiteEventIds,
} from '@/lib/check-in-events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChildrenForActiveCycle, useAttendance, useCheckInEvents } from '@/hooks/data';
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';
import { getServiceDayIso } from '@/lib/dal';
import { countChildrenOnSite } from '@/lib/attendance-open-count';
import type { Attendance } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { normalizeGradeDisplay, getGradeSortOrder } from '@/lib/gradeUtils';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type StatusFilter = 'all' | 'checkedIn' | 'checkedOut';

// Module-level constants to avoid new references on every render (PERF-13)
const EMPTY_CHILDREN: import('@/lib/types').Child[] = [];
const EMPTY_ATTENDANCE: Attendance[] = [];

// FilterControls extracted from CheckInContent to prevent remount on every render (PERF-12)
interface FilterControlsProps {
	statusFilter: StatusFilter;
	setStatusFilter: (f: StatusFilter) => void;
	availableGrades: string[];
	selectedGrades: Set<string>;
	toggleGrade: (g: string) => void;
	clearGrades: () => void;
}

function FilterControls({
	statusFilter,
	setStatusFilter,
	availableGrades,
	selectedGrades,
	toggleGrade,
	clearGrades,
}: FilterControlsProps) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label className="font-semibold shrink-0">Filter by Status:</Label>
				<div className="flex flex-wrap gap-2 items-center">
					<Button
						variant={statusFilter === 'all' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setStatusFilter('all')}>
						All
					</Button>
					<Button
						variant={statusFilter === 'checkedIn' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setStatusFilter('checkedIn')}>
						Checked In
					</Button>
					<Button
						variant={statusFilter === 'checkedOut' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setStatusFilter('checkedOut')}>
						Checked Out
					</Button>
				</div>
			</div>
			<div className="space-y-2">
				<Label className="font-semibold shrink-0">Filter by Grade:</Label>
				<div className="flex flex-wrap gap-2 items-center">
					{availableGrades.map((grade) => (
						<Button
							key={grade}
							variant={selectedGrades.has(grade) ? 'default' : 'outline'}
							size="sm"
							onClick={() => toggleGrade(grade)}
							className="rounded-full">
							{grade}
						</Button>
					))}
					{selectedGrades.size > 0 && (
						<Button variant="link" size="sm" onClick={clearGrades}>
							Clear
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

export function CheckInContentLegacy() {
	const { user } = useAuth();
	const isMobile = useIsMobile();
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const urlFilter = searchParams?.get('filter');
	const urlEvent = searchParams?.get('event');
	const searchKey = searchParams?.toString() ?? '';
	// Shared with the GatherSystem door so one link works on either. It also
	// accepts the `notCheckedIn` spelling and is case-insensitive, which the
	// hand-rolled comparison here was not.
	const initialStatus: StatusFilter = parseDoorStatusFilter(urlFilter) ?? 'all';
	// Taken as given until the persisted event list has loaded; see below.
	const initialEvent = urlEvent || 'evt_sunday_school';

	const [selectedEvent, setSelectedEvent] = useState(initialEvent);
	const [selectedGrades, setSelectedGrades] = useState<Set<string>>(() => new Set());
	const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
	const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
	const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
	const [prevSearchKey, setPrevSearchKey] = useState(searchKey);

	if (searchKey !== prevSearchKey) {
		setPrevSearchKey(searchKey);
		const parsedFilter = parseDoorStatusFilter(urlFilter);
		if (parsedFilter) {
			setStatusFilter(parsedFilter);
		}
		if (urlEvent) {
			setSelectedEvent(urlEvent);
		}
	}


	/**
	 * Write the screen's state to the query string.
	 *
	 * The picker was local state that the URL was only ever read from, so a
	 * reload — a slept phone, a restored tab, a stray refresh — silently
	 * reverted to whatever the URL still named. The next check-in is written
	 * against `selectedEvent`, so that meant staff could be looking at a door
	 * they did not pick.
	 *
	 * Both parameters are written together: writing one alone would drop the
	 * other on the next read and reset a hand-picked tab. `replace` rather than
	 * `push`, so a shift's worth of picker changes does not bury the back
	 * button. This mirrors the GatherSystem door's fix in #443.
	 */
	const writeScreenStateToUrl = (next: {
		status?: StatusFilter;
		event?: string;
	}) => {
		const query = buildDoorQuery(searchKey, {
			status: next.status ?? statusFilter,
			event: next.event ?? selectedEvent,
		});
		router.replace(query ? `${pathname}?${query}` : pathname, {
			scroll: false,
		});
	};

	const selectStatusFilter = (status: StatusFilter) => {
		setStatusFilter(status);
		writeScreenStateToUrl({ status });
	};

	const today = getServiceDayIso();
	// Check-in events from the `events` table (#561 review, #565).
	const { allEvents: allCheckInEvents, isPersisted: eventsPersisted } = useCheckInEvents();

	// Use React Query hooks for data fetching
	const { data: children = EMPTY_CHILDREN, isLoading: childrenLoading } = useChildrenForActiveCycle();
	const { data: todaysAttendance = EMPTY_ATTENDANCE, isLoading: attendanceLoading } =
		useAttendance(today);

	/**
	 * Events this screen's picker offers (#565): every active event, plus an
	 * archived one that still has children on site today, so that door stays
	 * reachable for check-out and transfer out until the last child leaves.
	 * Once both lists have loaded, an event the URL named that the picker does
	 * not offer falls back to the first one it does.
	 */
	const pickerEvents = useMemo(
		() => doorEventOptions(allCheckInEvents, onSiteEventIds(todaysAttendance)),
		[allCheckInEvents, todaysAttendance]
	);
	if (
		eventsPersisted &&
		!attendanceLoading &&
		pickerEvents.length > 0 &&
		!pickerEvents.some((e) => e.id === selectedEvent)
	) {
		setSelectedEvent(pickerEvents[0].id);
	}

	const loading = childrenLoading || attendanceLoading;

	const checkedInCount = useMemo(() => {
		if (!todaysAttendance) return 0;
		return countChildrenOnSite(todaysAttendance);
	}, [todaysAttendance]);

	const currentEventName = useMemo(() => {
		const event = pickerEvents.find((e) => e.id === selectedEvent);
		return event ? eventPickerLabel(event) : 'Select Event';
	}, [pickerEvents, selectedEvent]);

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

	const clearGrades = () => setSelectedGrades(new Set());

	if (loading) {
		return <CardGridSkeleton count={8} />;
	}

	return (
		<div className="flex flex-col gap-4">
			{eventsPersisted && pickerEvents.length === 0 && <NoCheckInEventsNotice />}
			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-bold font-headline text-muted-foreground">
							Child Check-In & Out
						</h1>
					</div>
					<Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
						<DialogTrigger asChild>
							<Button
								variant="link"
								className="text-3xl font-bold font-headline p-0 h-auto">
								{currentEventName}
								<Edit className="ml-2 h-5 w-5" />
							</Button>
						</DialogTrigger>
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
									writeScreenStateToUrl({ event: value });
									setIsEventDialogOpen(false);
								}}
								className="space-y-2">
								{pickerEvents.map((event) => (
									<Label
										key={event.id}
										htmlFor={event.id}
										className="flex items-center gap-4 p-4 border rounded-md cursor-pointer hover:bg-muted/50 has-[input:checked]:bg-muted has-[input:checked]:border-primary">
										<RadioGroupItem value={event.id} id={event.id} />
										<span>{eventPickerLabel(event)}</span>
									</Label>
								))}
							</RadioGroup>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card className="md:col-span-1">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Currently Checked In
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{checkedInCount}
							<span className="text-base font-medium text-muted-foreground">
								{' '}
								of {children.length}
							</span>
						</div>
						<p className="text-xs text-muted-foreground">
							children currently on site
						</p>
					</CardContent>
				</Card>

				{isMobile ? (
					<Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
						<SheetTrigger asChild>
							<Button variant="outline" className="w-full">
								<Filter className="mr-2 h-4 w-4" />
								Filters
							</Button>
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>Filters</SheetTitle>
								<SheetDescription>
									Refine the list of children below.
								</SheetDescription>
							</SheetHeader>
							<div className="py-4">
								<FilterControls
									statusFilter={statusFilter}
									setStatusFilter={selectStatusFilter}
									availableGrades={availableGrades}
									selectedGrades={selectedGrades}
									toggleGrade={toggleGrade}
									clearGrades={clearGrades}
								/>
							</div>
							<SheetFooter>
								<Button
									onClick={() => setIsFilterSheetOpen(false)}
									className="w-full">
									View Results
								</Button>
							</SheetFooter>
						</SheetContent>
					</Sheet>
				) : (
					<Card className="md:col-span-2">
						<CardContent className="pt-6">
							<FilterControls
								statusFilter={statusFilter}
								setStatusFilter={selectStatusFilter}
								availableGrades={availableGrades}
								selectedGrades={selectedGrades}
								toggleGrade={toggleGrade}
								clearGrades={clearGrades}
							/>
						</CardContent>
					</Card>
				)}
			</div>

			{/* eslint-disable react/no-children-prop */}
			<CheckInView
				children={children}
				todaysAttendance={todaysAttendance}
				selectedEvent={selectedEvent}
				selectedGrades={Array.from(selectedGrades)}
				statusFilter={statusFilter}
			/>
			{/* eslint-enable react/no-children-prop */}
		</div>
	);
}
