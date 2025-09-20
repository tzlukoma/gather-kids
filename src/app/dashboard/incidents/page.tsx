'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthRole } from '@/lib/auth-types';
import { IncidentForm } from '@/components/gatherKids/incident-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks';
import type { Incident } from '@/lib/types';
import { format } from 'date-fns';
import { acknowledgeIncident, getIncidentsForUser } from '@/lib/dal';
import { useAuth } from '@/contexts/auth-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function IncidentsPage() {
	const { toast } = useToast();
	const { user } = useAuth();
	const searchParams = useSearchParams();
	const [activeTab, setActiveTab] = useState('log');
	const [showPendingOnly, setShowPendingOnly] = useState(false);

	// State management for data loading
	const [incidents, setIncidents] = useState<Incident[]>([]);
	const [loading, setLoading] = useState(true);

	// Load incidents using DAL function
	useEffect(() => {
		const loadIncidents = async () => {
			if (!user) return;

			try {
				setLoading(true);
				const incidentsData = await getIncidentsForUser(user);
				setIncidents(incidentsData);
			} catch (error) {
				console.error('Error loading incidents:', error);
			} finally {
				setLoading(false);
			}
		};

		loadIncidents();
	}, [user]);

	useEffect(() => {
		const tabParam = searchParams.get('tab');
		if (tabParam === 'view') {
			setActiveTab('view');
		}
		const filterParam = searchParams.get('filter');
		if (filterParam === 'pending') {
			setShowPendingOnly(true);
		}
	}, [searchParams]);

	const displayedIncidents = useMemo(() => {
		if (loading) return [];
		if (showPendingOnly) {
			return incidents.filter((incident) => !incident.admin_acknowledged_at);
		}
		return incidents;
	}, [incidents, showPendingOnly, loading]);

	const handleAcknowledge = async (incidentId: string) => {
		try {
			await acknowledgeIncident(incidentId);

			// Refresh incidents after acknowledging
			const updatedIncidents = await getIncidentsForUser(user);
			setIncidents(updatedIncidents);

			toast({
				title: 'Incident Acknowledged',
				description: 'The incident has been marked as acknowledged.',
			});
		} catch (error) {
			console.error('Failed to acknowledge incident', error);
			toast({
				title: 'Error',
				description: 'Failed to acknowledge the incident.',
				variant: 'destructive',
			});
		}
	};

	if (loading) return <div>Loading incidents...</div>;

	if (user?.metadata?.role === AuthRole.MINISTRY_LEADER && !user.is_active) {
		return (
			<div className="flex flex-col gap-8">
				<Alert variant="destructive">
					<Info className="h-4 w-4" />
					<AlertTitle>Account Inactive</AlertTitle>
					<AlertDescription>
						Your leader account is currently inactive. You can only view
						historical incidents that you have logged.
					</AlertDescription>
				</Alert>
				<Card>
					<CardHeader>
						<CardTitle className="font-headline">
							Your Logged Incidents
						</CardTitle>
						<CardDescription>
							A log of all past incidents you have reported.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Child</TableHead>
									<TableHead>Severity</TableHead>
									<TableHead>Date & Time</TableHead>
									<TableHead className="w-[40%]">Description</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{displayedIncidents.map((incident) => (
									<TableRow key={incident.incident_id}>
										<TableCell className="font-medium">
											{incident.child_name}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													incident.severity === 'high'
														? 'destructive'
														: incident.severity === 'medium'
														? 'secondary'
														: 'outline'
												}
												className="capitalize">
												{incident.severity}
											</Badge>
										</TableCell>
										<TableCell>
											{format(new Date(incident.timestamp), 'PPpp')}
										</TableCell>
										<TableCell>{incident.description}</TableCell>
										<TableCell>
											<Badge
												variant={
													incident.admin_acknowledged_at
														? 'default'
														: 'destructive'
												}
												className={
													incident.admin_acknowledged_at
														? 'bg-brand-aqua hover:opacity-90'
														: ''
												}>
												{incident.admin_acknowledged_at
													? 'Acknowledged'
													: 'Pending'}
											</Badge>
										</TableCell>
									</TableRow>
								))}
								{displayedIncidents.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={5}
											className="text-center h-24 text-muted-foreground">
											You have not logged any incidents.
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

	return (
		<div className="flex flex-col gap-8">
			<div>
				<div className="flex items-center gap-2">
					<h1 className="text-3xl font-bold font-headline">
						Incident Management
					</h1>
					<Badge
						variant="secondary"
						className="text-xs bg-blue-100 text-blue-800 border border-blue-200">
						Beta
					</Badge>
				</div>
				<p className="text-muted-foreground">
					Log new incidents and review past occurrences.
				</p>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="log">Log New Incident</TabsTrigger>
					<TabsTrigger value="view">View Incidents</TabsTrigger>
				</TabsList>
				<TabsContent value="log">
					<Card>
						<CardHeader>
							<CardTitle className="font-headline">Log an Incident</CardTitle>
							<CardDescription>
								Complete this form to document an incident that occurred during
								a session.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<IncidentForm />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="view">
					<Card>
						<CardHeader>
							<div className="flex justify-between items-center">
								<div>
									<CardTitle className="font-headline">
										Incident History
									</CardTitle>
									<CardDescription>
										A log of all past incidents.
									</CardDescription>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="show-pending"
										checked={showPendingOnly}
										onCheckedChange={(checked) => setShowPendingOnly(!!checked)}
									/>
									<Label htmlFor="show-pending">Show pending only</Label>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Child</TableHead>
										<TableHead>Severity</TableHead>
										<TableHead>Date & Time</TableHead>
										<TableHead className="w-[40%]">Description</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{displayedIncidents.map((incident) => (
										<TableRow key={incident.incident_id}>
											<TableCell className="font-medium">
												{incident.child_name}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														incident.severity === 'high'
															? 'destructive'
															: incident.severity === 'medium'
															? 'secondary'
															: 'outline'
													}
													className="capitalize">
													{incident.severity}
												</Badge>
											</TableCell>
											<TableCell>
												{format(new Date(incident.timestamp), 'PPpp')}
											</TableCell>
											<TableCell>{incident.description}</TableCell>
											<TableCell>
												<Badge
													variant={
														incident.admin_acknowledged_at
															? 'default'
															: 'destructive'
													}
													className={
														incident.admin_acknowledged_at
															? 'bg-brand-aqua hover:opacity-90'
															: ''
													}>
													{incident.admin_acknowledged_at
														? 'Acknowledged'
														: 'Pending'}
												</Badge>
											</TableCell>
											<TableCell>
												{!incident.admin_acknowledged_at &&
													user?.metadata?.role === AuthRole.ADMIN && (
														<Button
															size="sm"
															onClick={() =>
																handleAcknowledge(incident.incident_id)
															}>
															Acknowledge
														</Button>
													)}
											</TableCell>
										</TableRow>
									))}
									{displayedIncidents.length === 0 && (
										<TableRow>
											<TableCell
												colSpan={6}
												className="text-center h-24 text-muted-foreground">
												No incidents match the current filter.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
