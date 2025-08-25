'use client';

import { useState, useEffect } from 'react';
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
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, FileDown } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
	exportAttendanceRollupCSV,
	exportEmergencySnapshotCSV,
	getTodayIsoDate,
} from '@/lib/dal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [isAuthorized, setIsAuthorized] = useState(false);

	const today = getTodayIsoDate();
	const { toast } = useToast();

	const [date, setDate] = useState<DateRange | undefined>({
		from: startOfMonth(new Date()),
		to: new Date(),
	});

	const checkedInChildren = useLiveQuery(async () => {
		const attendance = await db.attendance.where({ date: today }).toArray();
		if (!attendance.length) return [];
		const childIds = attendance.map((a) => a.child_id);
		return db.children.where('child_id').anyOf(childIds).toArray();
	}, [today]);

	useEffect(() => {
		if (!loading && user) {
			if (user?.metadata?.role !== AuthRole.ADMIN) {
				// Redirect non-admins to a role-appropriate page
				if (user?.metadata?.role === AuthRole.MINISTRY_LEADER) {
					router.push('/dashboard/rosters');
				} else {
					router.push('/');
				}
			} else {
				setIsAuthorized(true);
			}
		}
	}, [user, loading, router]);

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
				title: 'Error',
				description: 'Please select a date range.',
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

	if (loading || !isAuthorized) {
		return <div>Loading reports...</div>;
	}

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-bold font-headline">Reports & Exports</h1>
				<p className="text-muted-foreground">
					Generate reports and export data for ministry records.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="font-headline">Emergency Snapshot</CardTitle>
						<CardDescription>
							Today’s roster with critical allergy and contact information.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
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
										<TableCell
											colSpan={3}
											className="text-center h-24 text-muted-foreground">
											No children checked in today.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
					<CardFooter>
						<Button className="ml-auto" onClick={handleExportEmergency}>
							<FileDown className="mr-2 h-4 w-4" />
							Export CSV
						</Button>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="font-headline">Attendance Rollup</CardTitle>
						<CardDescription>
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
										initialFocus
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
