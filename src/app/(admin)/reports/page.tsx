'use client';

import { useState } from 'react';
import { AuthRole } from '@/lib/auth-types';
import { Calendar } from '@/components/ui/calendar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, FileDown, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { format, startOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	exportAttendanceRollupCSV,
	exportEmergencySnapshotCSV,
	getServiceDayIso,
} from '@/lib/dal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useCheckedInChildren } from '@/hooks/data/children';
import { useGatherSystemShell } from '@/components/gatherKids/gathersystem-shell-context';
import {
	STAFF_CARD,
	STAFF_PAGE_TITLE,
	STAFF_SECTION_DESCRIPTION,
	STAFF_SECTION_TITLE,
	STAFF_TABLE_DENSE,
} from '@/components/gatherKids/staff-list-styles';
import { PermissionEmpty } from '@/components/ui/permission-empty';
import { LoadStalled } from '@/components/ui/load-stalled';
import { useLoadingTimeout } from '@/hooks/use-loading-timeout';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

export default function ReportsPage() {
	const gatherSystem = useGatherSystemShell();
	const { user, loading } = useAuth();
	const isAuthorized = !loading && !!user && user.metadata?.role === AuthRole.ADMIN;

	const today = getServiceDayIso();
	const { toast } = useToast();

	const [date, setDate] = useState<DateRange | undefined>({
		from: startOfMonth(new Date()),
		to: new Date(),
	});

	// React Query hook for checked-in children
	const {
		data: checkedInChildren = [],
		isLoading: dataLoading,
		error: dataError,
		refetch: refetchCheckedIn,
	} = useCheckedInChildren(today);

	// A skeleton promises something is about to arrive. Once a load runs long
	// enough that the promise is no longer credible, say so instead.
	const rosterOverdue = useLoadingTimeout(dataLoading);

	const handleExportEmergency = async () => {
		const blob = await exportEmergencySnapshotCSV(today);
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `emergency_snapshot_${today}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast({
			title: 'Exported',
			description: 'Emergency Snapshot CSV has been downloaded.',
		});
	};

	const handleExportAttendance = async () => {
		if (!date?.from || !date?.to) {
			toast({
				title: 'Date Range Required',
				description: 'Please select a date range to generate the report.',
				variant: 'destructive',
			});
			return;
		}
		const blob = await exportAttendanceRollupCSV(
			date.from.toISOString(),
			date.to.toISOString()
		);
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `attendance_rollup_${format(
			date.from,
			'yyyy-MM-dd'
		)}_to_${format(date.to, 'yyyy-MM-dd')}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast({
			title: 'Exported',
			description: 'Attendance Rollup CSV has been downloaded.',
		});
	};

	// These were one branch, so a non-admin sat on "Loading reports..." for ever:
	// the page cannot load for them and never said so. Authorisation is a
	// settled answer, not a slow one.
	if (loading) {
		return <TableSkeleton rows={6} columns={3} />;
	}

	if (!isAuthorized) {
		return (
			<PermissionEmpty
				reason="restricted"
				title="Reports are limited to administrators"
				description="Your account does not have access to ministry reports and exports."
				remedy="If you need access, ask an administrator to update your role."
			/>
		);
	}

	if (dataError) {
		console.error('Error loading checked-in children:', dataError);
	}

	return (
		<div className="flex flex-col gap-8">
			<div>
				<div className="flex items-center gap-2">
					<h1
						className={cn(
							gatherSystem
								? STAFF_PAGE_TITLE
								: 'text-3xl font-bold font-headline'
						)}>
						Reports & Exports
					</h1>
					<Badge
						variant="secondary"
						className="text-xs bg-blue-100 text-blue-800 border border-blue-200">
						Beta
					</Badge>
				</div>
				<p
					className={cn(
						gatherSystem ? STAFF_SECTION_DESCRIPTION : 'text-muted-foreground'
					)}>
					Generate reports and export data for ministry records.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
				<Card className={cn(gatherSystem && STAFF_CARD)}>
					<CardHeader>
						<CardTitle
							className={cn(
								gatherSystem ? STAFF_SECTION_TITLE : 'font-headline'
							)}>
							Emergency Snapshot
						</CardTitle>
						<CardDescription
							className={cn(gatherSystem && STAFF_SECTION_DESCRIPTION)}>
							Today’s roster with critical allergy and contact information.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{dataError ? (
							<LoadStalled
								tone="error"
								title="Today’s roster didn’t load"
								description="The emergency snapshot could not be fetched. The CSV export below still works."
								onRetry={() => void refetchCheckedIn()}
							/>
						) : rosterOverdue ? (
							<LoadStalled
								tone="slow"
								title="Today’s roster is slow to load"
								description="This is taking longer than expected. It may still arrive, or you can ask for it again."
								onRetry={() => void refetchCheckedIn()}
							/>
						) : dataLoading ? (
							<TableSkeleton rows={5} columns={3} />
						) : (
						<Table className={cn(gatherSystem && STAFF_TABLE_DENSE)}>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Allergies</TableHead>
									<TableHead>Notes</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{checkedInChildren?.map((child) => (
									<TableRow key={child.child_id}>
										<TableCell className="font-medium">
											{child.first_name} {child.last_name}
										</TableCell>
										<TableCell>
											{child.allergies ? (
												<Badge variant="destructive">{child.allergies}</Badge>
											) : (
												'None'
											)}
										</TableCell>
										<TableCell>{child.medical_notes ?? 'N/A'}</TableCell>
									</TableRow>
								))}
								{(!checkedInChildren || checkedInChildren.length === 0) && (
									<TableRow>
										<TableCell colSpan={3}>
											<EmptyState
												className="py-6"
												icon={Users}
												title="No children checked in today."
											/>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
						)}
					</CardContent>
					<CardFooter>
						<Button className="ml-auto" onClick={handleExportEmergency}>
							<FileDown className="mr-2 h-4 w-4" />
							Export CSV
						</Button>
					</CardFooter>
				</Card>

				<Card className={cn(gatherSystem && STAFF_CARD)}>
					<CardHeader>
						<CardTitle
							className={cn(
								gatherSystem ? STAFF_SECTION_TITLE : 'font-headline'
							)}>
							Attendance Rollup
						</CardTitle>
						<CardDescription
							className={cn(gatherSystem && STAFF_SECTION_DESCRIPTION)}>
							Generate an attendance report for a specific date range.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4">
						<div className="grid gap-2">
							<Popover>
								<PopoverTrigger asChild>
									<Button
										id="date"
										variant={'outline'}
										className={cn(
											'w-full justify-start text-left font-normal',
											!date && 'text-muted-foreground'
										)}>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{date?.from ? (
											date.to ? (
												<>
													{format(date.from, 'LLL dd, y')} -{' '}
													{format(date.to, 'LLL dd, y')}
												</>
											) : (
												format(date.from, 'LLL dd, y')
											)
										) : (
											<span>Pick a date range</span>
										)}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										autoFocus
										mode="range"
										defaultMonth={date?.from}
										selected={date}
										onSelect={setDate}
										numberOfMonths={2}
									/>
								</PopoverContent>
							</Popover>
						</div>
					</CardContent>
					<CardFooter>
						<Button className="ml-auto" onClick={handleExportAttendance}>
							<FileDown className="mr-2 h-4 w-4" />
							Export CSV
						</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
