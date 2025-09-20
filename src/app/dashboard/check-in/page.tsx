'use client';

import { useState, useMemo, useEffect } from 'react';
import { CheckInView } from '@/components/gatherKids/check-in-view';
import { ROLES } from '@/lib/constants/roles';
import { ProtectedRoute } from '@/components/auth/protected-route';
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
import { useSearchParams } from 'next/navigation';
import { Users, Filter, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChildren, useAttendance } from '@/lib/hooks/useData';
import { Badge } from '@/components/ui/badge';
import { getTodayIsoDate } from '@/lib/dal';
import type { Child, Attendance } from '@/lib/types';
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

const eventOptions = [
	{ id: 'evt_sunday_school', name: 'Sunday School' },
	{ id: 'evt_childrens_church', name: 'Children&apos;s Church' },
	{ id: 'evt_teen_church', name: 'Teen Church' },
];

function CheckInContent() {
	const { user } = useAuth();
	const isMobile = useIsMobile();
	const searchParams = useSearchParams();

	const [selectedEvent, setSelectedEvent] = useState('evt_sunday_school');
	const [selectedGrades, setSelectedGrades] = useState<Set<string>>(new Set());
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
	const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

	const today = getTodayIsoDate();

	// Use React Query hooks for data fetching
	const { data: children = [], isLoading: childrenLoading } = useChildren();
	const { data: todaysAttendance = [], isLoading: attendanceLoading } =
		useAttendance(today);

	const loading = childrenLoading || attendanceLoading;

	const checkedInCount = useMemo(() => {
		if (!todaysAttendance) return 0;
		return todaysAttendance.filter((a) => !a.check_out_at).length;
	}, [todaysAttendance]);

	const currentEventName = useMemo(() => {
		return (
			eventOptions.find((e) => e.id === selectedEvent)?.name || 'Select Event'
		);
	}, [selectedEvent]);

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

	// Read query params on mount / when they change and apply initial filters.
	useEffect(() => {
		if (!searchParams) return;
		const filter = searchParams.get('filter');
		if (filter === 'checkedIn' || filter === 'checkedOut' || filter === 'all') {
			setStatusFilter(filter as StatusFilter);
		}
		const event = searchParams.get('event');
		if (event && eventOptions.find((e) => e.id === event)) {
			setSelectedEvent(event);
		}
	}, [searchParams]);

	const FilterControls = () => (
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
						<Button
							variant="link"
							size="sm"
							onClick={() => setSelectedGrades(new Set())}>
							Clear
						</Button>
					)}
				</div>
			</div>
		</div>
	);

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center h-64">
				<p className="text-muted-foreground mb-4">
					Loading children&apos;s data...
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-bold font-headline text-muted-foreground">
							Child Check-In & Out
						</h1>
						<Badge
							variant="secondary"
							className="text-xs bg-blue-100 text-blue-800 border border-blue-200">
							Beta
						</Badge>
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
								<FilterControls />
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
							<FilterControls />
						</CardContent>
					</Card>
				)}
			</div>

			<CheckInView
				children={children}
				todaysAttendance={todaysAttendance}
				selectedEvent={selectedEvent}
				selectedGrades={Array.from(selectedGrades)}
				statusFilter={statusFilter}
			/>
		</div>
	);
}

export default function Page() {
	return (
		<ProtectedRoute
			allowedRoles={[ROLES.ADMIN, ROLES.MINISTRY_LEADER, ROLES.GUARDIAN]}>
			<CheckInContent />
		</ProtectedRoute>
	);
}
