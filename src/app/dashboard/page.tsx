'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
import { AlertTriangle, Users, CheckCircle2, Home } from 'lucide-react';
import { format } from 'date-fns';
import { getTodayIsoDate } from '@/lib/dal';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthRole } from '@/lib/auth-types';
import type { Incident } from '@/lib/types';
import {
	useUnacknowledgedIncidents,
	useCheckedInCount,
	useRegistrationStats,
} from '@/hooks/data/dashboard';
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton';

export default function DashboardPage() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [isAuthorized, setIsAuthorized] = useState(false);

	const today = getTodayIsoDate();

	// Use React Query hooks for data fetching
	const {
		data: unacknowledgedIncidents = [],
		isLoading: incidentsLoading,
		error: incidentsError,
	} = useUnacknowledgedIncidents();
	const {
		data: checkedInCount = 0,
		isLoading: countLoading,
		error: countError,
	} = useCheckedInCount(today);
	const {
		data: registrationStats = { householdCount: 0, childCount: 0 },
		isLoading: statsLoading,
		error: statsError,
	} = useRegistrationStats();

	const isLoading = incidentsLoading || countLoading || statsLoading;

	// Handle errors from React Query
	useEffect(() => {
		if (incidentsError || countError || statsError) {
			console.warn(
				'Error loading dashboard data:',
				incidentsError || countError || statsError
			);
		}
	}, [incidentsError, countError, statsError]);

	useEffect(() => {
		if (!loading && user) {
			if (user?.metadata?.role !== AuthRole.ADMIN) {
				// Non-admin users are redirected from the layout based on their permissions.
				// This page is for admins only. If a non-admin somehow lands here,
				// the layout will redirect them. We'll just prevent rendering the content.
				setIsAuthorized(false);
			} else {
				setIsAuthorized(true);
			}
		}
	}, [user, loading, router]);

	if (loading || !isAuthorized || isLoading) {
		return <CardGridSkeleton cards={4} />;
	}

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
				<p className="text-muted-foreground">
					Overview of ministry activities and statuses.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Link href="/dashboard/check-in?filter=checkedIn">
					<Card className="hover:bg-muted/50 transition-colors">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Checked-In Children
							</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
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
				<Link href="/dashboard/incidents?tab=view&filter=pending">
					<Card className="hover:bg-muted/50 transition-colors">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Pending Incidents
							</CardTitle>
							<AlertTriangle className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{unacknowledgedIncidents.length}
							</div>
							<p className="text-xs text-muted-foreground">
								requires acknowledgement
							</p>
						</CardContent>
					</Card>
				</Link>
				<Link href="/dashboard/registrations">
					<Card className="hover:bg-muted/50 transition-colors">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Registrations (2025)
							</CardTitle>
							<Home className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
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

			<Card>
				<CardHeader>
					<CardTitle className="font-headline">
						Recent Unacknowledged Incidents
					</CardTitle>
					<CardDescription>
						These incidents require your immediate attention.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Child</TableHead>
								<TableHead>Severity</TableHead>
								<TableHead>Time</TableHead>
								<TableHead className="w-[50%]">Description</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{unacknowledgedIncidents.map((incident) => (
								<TableRow key={incident.incident_id}>
									<TableCell className="font-medium">
										{incident.child_name}
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
								</TableRow>
							))}
							{unacknowledgedIncidents.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={4}
										className="text-center h-24 text-muted-foreground">
										No unacknowledged incidents.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
