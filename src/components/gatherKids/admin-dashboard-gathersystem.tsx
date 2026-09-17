'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	AlertTriangle,
	Users,
	CheckCircle2,
	Home,
	FileText,
	ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { getTodayIsoDate } from '@/lib/dal';
import { useAuth } from '@/contexts/auth-context';
import { useEffect } from 'react';
import { AuthRole } from '@/lib/auth-types';
import {
	useUnacknowledgedIncidents,
	useCheckedInCount,
	useRegistrationStats,
} from '@/hooks/data/dashboard';
import { useAcknowledgeIncident } from '@/hooks/data';
import { useToast } from '@/hooks/use-toast';
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';

// Module-level constants to avoid new references on every render (PERF-13)
const EMPTY_INCIDENTS: import('@/lib/types').Incident[] = [];
const DEFAULT_REGISTRATION_STATS = {
	householdCount: 0,
	childCount: 0,
	cycleName: undefined as string | undefined,
};

// Dashboard report shortcuts route to /reports (Screen SPEC sign-off
// 2026-09-16); CSV generation itself stays on the Reports page.
const REPORT_LINKS = [
	{ label: 'Emergency Snapshot', description: 'Checked-in roster with allergies and contacts' },
	{ label: 'Attendance Rollup', description: 'Check-in history for a date range' },
];

function initialsFor(name: string | undefined): string {
	if (!name) return '?';
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');
}

export function AdminDashboardGatherSystem() {
	const { user, loading } = useAuth();
	const { toast } = useToast();
	const isAuthorized =
		!loading && !!user && user.metadata?.role === AuthRole.ADMIN;

	const today = getTodayIsoDate();

	const {
		data: unacknowledgedIncidents = EMPTY_INCIDENTS,
		isLoading: incidentsLoading,
		error: incidentsError,
	} = useUnacknowledgedIncidents();
	const {
		data: checkedInCount = 0,
		isLoading: countLoading,
		error: countError,
	} = useCheckedInCount(today);
	const {
		data: registrationStats = DEFAULT_REGISTRATION_STATS,
		isLoading: statsLoading,
		error: statsError,
	} = useRegistrationStats();
	const acknowledgeMutation = useAcknowledgeIncident();

	const isLoading = incidentsLoading || countLoading || statsLoading;

	useEffect(() => {
		if (incidentsError || countError || statsError) {
			console.warn(
				'Error loading dashboard data:',
				incidentsError || countError || statsError
			);
		}
	}, [incidentsError, countError, statsError]);

	// Same acknowledge mutation and authorization as /incidents; this page is
	// additionally gated to ADMIN above.
	const handleAcknowledge = async (incidentId: string) => {
		try {
			await acknowledgeMutation.mutateAsync(incidentId);
			toast({
				title: 'Incident Acknowledged',
				description: 'The incident has been marked as acknowledged.',
			});
		} catch (error) {
			console.error('Failed to acknowledge incident', error);
			toast({
				title: 'Acknowledgement Failed',
				description: 'Failed to acknowledge the incident. Please try again.',
				variant: 'destructive',
			});
		}
	};

	if (!isAuthorized || isLoading) {
		return <CardGridSkeleton count={4} />;
	}

	const hasPendingIncidents = unacknowledgedIncidents.length > 0;
	const cycleLabel = registrationStats.cycleName
		? /cycle/i.test(registrationStats.cycleName)
			? registrationStats.cycleName
			: `${registrationStats.cycleName} cycle`
		: null;
	const eyebrow = [format(new Date(), 'EEEE MMM d'), cycleLabel]
		.filter(Boolean)
		.join(' · ');

	return (
		<div className="flex flex-col gap-6 md:gap-8">
			{/* Header: eyebrow, title, report/check-in actions */}
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
						{eyebrow}
					</p>
					<h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
					<p className="text-muted-foreground">
						Overview of ministry activities and statuses.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button asChild variant="outline">
						<Link href="/reports">Emergency snapshot</Link>
					</Button>
					<Button asChild>
						<Link href="/check-in">Open check-in</Link>
					</Button>
				</div>
			</div>

			{/* KPI cards — live metric set preserved (no additions/removals) */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Link href="/check-in?filter=checkedIn">
					<Card className="h-full hover:bg-muted/50 transition-colors">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
								Checked-In Children
							</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold">
								{checkedInCount}
								<span className="text-base font-medium text-muted-foreground">
									{' '}
									of {registrationStats.childCount}
								</span>
							</div>
							<p className="text-xs text-muted-foreground">
								registered children currently on site
							</p>
						</CardContent>
					</Card>
				</Link>
				<Link href="/incidents?tab=view&filter=pending">
					<Card className="h-full hover:bg-muted/50 transition-colors">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
								Pending Incidents
							</CardTitle>
							<AlertTriangle className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div
								className={`text-3xl font-bold ${
									hasPendingIncidents ? 'text-destructive' : ''
								}`}>
								{unacknowledgedIncidents.length}
							</div>
							<p className="text-xs text-muted-foreground">
								{hasPendingIncidents
									? 'require your acknowledgement'
									: 'nothing needs your acknowledgement'}
							</p>
						</CardContent>
					</Card>
				</Link>
				<Link href="/registrations">
					<Card className="h-full hover:bg-muted/50 transition-colors">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
								Registrations
								{registrationStats.cycleName
									? ` · ${registrationStats.cycleName}`
									: ''}
							</CardTitle>
							<Home className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold">
								{registrationStats.householdCount}
							</div>
							<p className="text-xs text-muted-foreground">
								{registrationStats.childCount} children in{' '}
								{registrationStats.householdCount} households
							</p>
						</CardContent>
					</Card>
				</Link>
			</div>

			{/* Unacknowledged incidents: busy table vs quiet state */}
			<Card>
				<CardHeader>
					<CardTitle className="font-headline">
						Recent Unacknowledged Incidents
					</CardTitle>
					<CardDescription>
						{hasPendingIncidents
							? 'These incidents require your immediate attention.'
							: 'Incident log lives on the Incidents page.'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{hasPendingIncidents ? (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Child</TableHead>
										<TableHead>Severity</TableHead>
										<TableHead>Time</TableHead>
										<TableHead className="w-[45%]">Description</TableHead>
										<TableHead className="text-right">Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{unacknowledgedIncidents.map((incident) => (
										<TableRow key={incident.incident_id}>
											<TableCell className="font-medium">
												<span className="inline-flex items-center gap-2">
													<span
														aria-hidden="true"
														className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
														{initialsFor(incident.child_name)}
													</span>
													{incident.child_name}
												</span>
											</TableCell>
											<TableCell>
												<Badge
													variant={
														incident.severity === 'high'
															? 'destructive'
															: 'secondary'
													}
													className="capitalize">
													{incident.severity}
												</Badge>
											</TableCell>
											<TableCell>
												{format(new Date(incident.timestamp), 'p')}
											</TableCell>
											<TableCell>{incident.description}</TableCell>
											<TableCell className="text-right">
												<Button
													variant="outline"
													size="sm"
													disabled={acknowledgeMutation.isPending}
													onClick={() =>
														handleAcknowledge(incident.incident_id)
													}>
													Acknowledge
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : (
						<div className="flex items-center gap-3 py-6 text-muted-foreground">
							<CheckCircle2 className="h-5 w-5 text-brand-teal" aria-hidden="true" />
							<p>No unacknowledged incidents. Nothing needs your acknowledgement.</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Reports shortcuts — action-only rows routed to /reports */}
			<Card>
				<CardHeader>
					<CardTitle className="font-headline">Reports</CardTitle>
					<CardDescription>
						Generate CSV downloads from the Reports page.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-2">
					{REPORT_LINKS.map((report) => (
						<Link
							key={report.label}
							href="/reports"
							className="flex items-center justify-between rounded-md border bg-background px-4 py-3 transition-colors hover:bg-muted/50">
							<span className="flex items-center gap-3">
								<FileText
									className="h-4 w-4 text-muted-foreground"
									aria-hidden="true"
								/>
								<span>
									<span className="block font-medium">{report.label}</span>
									<span className="block text-xs text-muted-foreground">
										{report.description}
									</span>
								</span>
							</span>
							<ChevronRight
								className="h-4 w-4 text-muted-foreground"
								aria-hidden="true"
							/>
						</Link>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
