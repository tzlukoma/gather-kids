'use client';

import { useState, useMemo } from 'react';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Incident } from '@/lib/types';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/auth-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, CalendarIcon, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	useScopedIncidents,
	useAcknowledgeIncident,
} from '@/hooks/data/attendance';
import {
	useChildrenForActiveCycle,
	useMinistries,
	useIncidentMinistryScope,
	useRegistrationCycles,
} from '@/hooks/data';
import { IncidentDetailDialogGatherSystem } from '@/components/gatherKids/incident-detail-dialog-gathersystem';
import {
	ALL_MINISTRIES,
	buildMinistryIdsByChild,
	filterIncidents,
	hasActiveIncidentFilters,
	type IncidentSeverityFilter,
	type IncidentStatusFilter,
} from '@/lib/incidents-filter';

type StatusFilter = IncidentStatusFilter;
type SeverityFilter = IncidentSeverityFilter;

function initialsFor(name: string | undefined): string {
	if (!name) return '?';
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');
}

function severityBadgeVariant(severity: string) {
	if (severity === 'high') return 'destructive' as const;
	if (severity === 'medium') return 'secondary' as const;
	return 'outline' as const;
}

export function IncidentsContentGatherSystem() {
	const { toast } = useToast();
	const { user } = useAuth();
	const searchParams = useSearchParams();
	const searchKey = searchParams.toString();
	const tabParam = searchParams.get('tab');
	const filterParam = searchParams.get('filter');

	const [activeTab, setActiveTab] = useState(tabParam === 'view' ? 'view' : 'log');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>(
		filterParam === 'pending' ? 'pending' : 'all'
	);
	const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
	const [ministryFilter, setMinistryFilter] = useState<string>(ALL_MINISTRIES);
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
	const [showAllCycles, setShowAllCycles] = useState(false);
	const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
	const [prevSearchKey, setPrevSearchKey] = useState(searchKey);

	// Preserve the legacy deep-link contract (`?tab=view&filter=pending`), which
	// the admin dashboard's Pending Incidents card relies on.
	if (searchKey !== prevSearchKey) {
		setPrevSearchKey(searchKey);
		setActiveTab(tabParam === 'view' ? 'view' : 'log');
		setStatusFilter(filterParam === 'pending' ? 'pending' : 'all');
	}

	// Authorization boundary. The visible set matches the legacy screen exactly —
	// an admin sees every incident, anyone else only the incidents they logged —
	// but it is resolved by `/api/incidents` from the validated session and
	// applied as a database predicate, so rows this screen will not render never
	// reach the browser. The legacy screen still filters client-side (#428); this
	// screen is gated by `gathersystem_incidents`, so nothing changes until the
	// flag is on.
	const {
		data: incidents = [],
		isLoading: loading,
		error,
	} = useScopedIncidents(!!user);
	const { data: cycleChildren = [] } = useChildrenForActiveCycle();
	const { data: activeCycles = [] } = useRegistrationCycles(true);
	const activeCycleId = activeCycles[0]?.cycle_id ?? '';
	const { data: ministries = [] } = useMinistries(true);
	// Ministry membership for the ministry filter. Resolved by
	// `/api/incidents/ministry-scope`, which derives the allowed children from the
	// session server-side — this component sends no child ids, so the scope is not
	// something the browser can widen. Only child/ministry id pairs come back.
	//
	// An `Incident` carries no cycle, so a child in a past-cycle incident has no
	// active-cycle enrollment row. Scoping to the active cycle would drop those
	// incidents from any ministry selection and omit history-only ministries from
	// the options, so the cycle scope is dropped once past cycles are shown.
	const { data: ministryEnrollments = [] } = useIncidentMinistryScope(
		showAllCycles ? undefined : activeCycleId
	);
	const acknowledgeMutation = useAcknowledgeIncident();

	const cycleChildIds = useMemo(
		() => new Set(cycleChildren.map((child) => child.child_id)),
		[cycleChildren]
	);

	const ministryIdsByChild = useMemo(
		() => buildMinistryIdsByChild(ministryEnrollments),
		[ministryEnrollments]
	);

	// "In context" = what this user may see, after the cycle scope toggle only.
	// This is the baseline used to tell a truly empty log apart from a filter
	// that happens to match nothing.
	const incidentsInContext = useMemo(() => {
		if (loading) return [];
		if (showAllCycles) return incidents;
		return incidents.filter((incident) => cycleChildIds.has(incident.child_id));
	}, [incidents, showAllCycles, cycleChildIds, loading]);

	const ministryFilterOptions = useMemo(() => {
		const present = new Set<string>();
		for (const incident of incidentsInContext) {
			for (const ministryId of ministryIdsByChild.get(incident.child_id) ?? []) {
				present.add(ministryId);
			}
		}
		return ministries
			.filter((ministry) => present.has(ministry.ministry_id))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [incidentsInContext, ministryIdsByChild, ministries]);

	const displayedIncidents = useMemo(
		() =>
			filterIncidents(
				incidentsInContext,
				{
					status: statusFilter,
					severity: severityFilter,
					ministryId: ministryFilter,
					dateRange,
				},
				ministryIdsByChild
			),
		[
			incidentsInContext,
			statusFilter,
			severityFilter,
			ministryFilter,
			dateRange,
			ministryIdsByChild,
		]
	);

	const pendingCount = useMemo(
		() => incidentsInContext.filter((i) => !i.admin_acknowledged_at).length,
		[incidentsInContext]
	);

	const isAdmin = user?.metadata?.role === AuthRole.ADMIN;
	const hasActiveFilters = hasActiveIncidentFilters({
		status: statusFilter,
		severity: severityFilter,
		ministryId: ministryFilter,
		dateRange,
	});

	const clearFilters = () => {
		setStatusFilter('all');
		setSeverityFilter('all');
		setMinistryFilter(ALL_MINISTRIES);
		setDateRange(undefined);
	};

	// Same authorization check as the legacy list and as `/incidents` today:
	// acknowledging is ADMIN-only. The flag never widens this.
	const canAcknowledge = (incident: Incident) =>
		isAdmin && !incident.admin_acknowledged_at;

	const handleAcknowledge = async (incidentId: string) => {
		try {
			await acknowledgeMutation.mutateAsync(incidentId);
			setSelectedIncident((current) =>
				current && current.incident_id === incidentId
					? { ...current, admin_acknowledged_at: new Date().toISOString() }
					: current
			);
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

	if (loading) return <div>Loading incidents...</div>;

	if (error) {
		console.error('Error loading incidents:', error);
		return <div>Error loading incidents. Please try again.</div>;
	}

	// Inactive leaders keep the restricted, read-only view they have today.
	if (user?.metadata?.role === AuthRole.MINISTRY_LEADER && !user.is_active) {
		return (
			<div className="flex flex-col gap-6">
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
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Child</TableHead>
										<TableHead>Severity</TableHead>
										<TableHead>Date &amp; Time</TableHead>
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
													variant={severityBadgeVariant(incident.severity)}
													className="capitalize">
													{incident.severity}
												</Badge>
											</TableCell>
											<TableCell>
												{format(new Date(incident.timestamp), 'PPpp')}
											</TableCell>
											<TableCell>{incident.description}</TableCell>
											<TableCell>
												<StatusBadge incident={incident} />
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
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const cycleName = activeCycles[0]?.name;
	const cycleLabel = cycleName
		? /cycle/i.test(cycleName)
			? cycleName
			: `${cycleName} cycle`
		: null;
	const eyebrow = [format(new Date(), 'EEEE MMM d'), cycleLabel]
		.filter(Boolean)
		.join(' · ');

	return (
		<div className="flex flex-col gap-6">
			<div>
				<p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
					{eyebrow}
				</p>
				<div className="flex items-center gap-2">
					<h1 className="text-3xl font-bold font-headline">Incidents</h1>
					<Badge
						variant="secondary"
						className="text-xs bg-blue-100 text-blue-800 border border-blue-200">
						Beta
					</Badge>
				</div>
				<p className="text-muted-foreground">
					{isAdmin
						? 'Log and acknowledge anything that happened during a session.'
						: 'Log anything that happened during a session.'}
				</p>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
					<TabsTrigger value="log">Log New Incident</TabsTrigger>
					<TabsTrigger value="view">View Incidents</TabsTrigger>
				</TabsList>

				<TabsContent value="log">
					<Card>
						<CardHeader>
							<CardTitle className="font-headline">Log an Incident</CardTitle>
							<CardDescription>
								Complete this form to document an incident that occurred during a
								session.
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
							<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<CardTitle className="font-headline">
										{showAllCycles ? 'All Incidents' : 'Incidents This Cycle'}
									</CardTitle>
									<CardDescription>
										{isAdmin
											? 'Acknowledge each one so it clears the dashboard.'
											: 'Incidents you have logged.'}
									</CardDescription>
								</div>
								<div className="text-sm text-muted-foreground whitespace-nowrap">
									{pendingCount} pending · {incidentsInContext.length} total
								</div>
							</div>
						</CardHeader>

						{/* First-view filters: status, severity, date range, ministry */}
						<CardContent className="flex flex-col gap-4">
							<div className="flex flex-wrap items-end gap-3">
								<div className="grid gap-1.5">
									<Label htmlFor="incident-status">Status</Label>
									<Select
										value={statusFilter}
										onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
										<SelectTrigger id="incident-status" className="w-[160px]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All statuses</SelectItem>
											<SelectItem value="pending">Pending</SelectItem>
											<SelectItem value="acknowledged">Acknowledged</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="grid gap-1.5">
									<Label htmlFor="incident-severity">Severity</Label>
									<Select
										value={severityFilter}
										onValueChange={(v) =>
											setSeverityFilter(v as SeverityFilter)
										}>
										<SelectTrigger id="incident-severity" className="w-[160px]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All severities</SelectItem>
											<SelectItem value="high">High</SelectItem>
											<SelectItem value="medium">Medium</SelectItem>
											<SelectItem value="low">Low</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="grid gap-1.5">
									<Label htmlFor="incident-date">Date range</Label>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												id="incident-date"
												variant="outline"
												className={cn(
													'w-[240px] justify-start text-left font-normal',
													!dateRange?.from && 'text-muted-foreground'
												)}>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{dateRange?.from ? (
													dateRange.to ? (
														<>
															{format(dateRange.from, 'LLL dd, y')} -{' '}
															{format(dateRange.to, 'LLL dd, y')}
														</>
													) : (
														format(dateRange.from, 'LLL dd, y')
													)
												) : (
													<span>Any date</span>
												)}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												autoFocus
												mode="range"
												defaultMonth={dateRange?.from}
												selected={dateRange}
												onSelect={setDateRange}
												numberOfMonths={2}
											/>
										</PopoverContent>
									</Popover>
								</div>

								{ministryFilterOptions.length > 0 && (
									<div className="grid gap-1.5">
										<Label htmlFor="incident-ministry">Ministry</Label>
										<Select
											value={ministryFilter}
											onValueChange={setMinistryFilter}>
											<SelectTrigger
												id="incident-ministry"
												className="w-[200px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={ALL_MINISTRIES}>
													All ministries
												</SelectItem>
												{ministryFilterOptions.map((ministry) => (
													<SelectItem
														key={ministry.ministry_id}
														value={ministry.ministry_id}>
														{ministry.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{hasActiveFilters && (
									<Button variant="ghost" onClick={clearFilters}>
										Clear filters
									</Button>
								)}
							</div>

							<div className="flex items-center space-x-2">
								<Checkbox
									id="show-all-cycles"
									checked={showAllCycles}
									onCheckedChange={(checked) => setShowAllCycles(!!checked)}
								/>
								<Label htmlFor="show-all-cycles">Include past cycles</Label>
							</div>

							{incidentsInContext.length === 0 ? (
								<EmptyLog
									showAllCycles={showAllCycles}
									onLogIncident={() => setActiveTab('log')}
									onIncludePastCycles={() => setShowAllCycles(true)}
								/>
							) : displayedIncidents.length === 0 ? (
								<NoFilterMatches
									onClearFilters={clearFilters}
									onLogIncident={() => setActiveTab('log')}
								/>
							) : (
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Child</TableHead>
												<TableHead>Severity</TableHead>
												<TableHead>Date &amp; Time</TableHead>
												<TableHead className="w-[35%]">Description</TableHead>
												<TableHead>Status</TableHead>
												<TableHead className="text-right">Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{displayedIncidents.map((incident) => (
												<TableRow
													key={incident.incident_id}
													className="cursor-pointer"
													onClick={() => setSelectedIncident(incident)}>
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
															variant={severityBadgeVariant(incident.severity)}
															className="capitalize">
															{incident.severity}
														</Badge>
													</TableCell>
													<TableCell className="whitespace-nowrap">
														{format(new Date(incident.timestamp), 'PPpp')}
													</TableCell>
													<TableCell>{incident.description}</TableCell>
													<TableCell>
														<StatusBadge incident={incident} />
													</TableCell>
													<TableCell
														className="text-right"
														onClick={(e) => e.stopPropagation()}>
														{canAcknowledge(incident) ? (
															<Button
																variant="outline"
																size="sm"
																disabled={acknowledgeMutation.isPending}
																onClick={() =>
																	handleAcknowledge(incident.incident_id)
																}>
																Acknowledge
															</Button>
														) : (
															<span
																className="text-muted-foreground"
																aria-hidden="true">
																—
															</span>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<IncidentDetailDialogGatherSystem
				incident={selectedIncident}
				canAcknowledge={!!selectedIncident && canAcknowledge(selectedIncident)}
				isAcknowledging={acknowledgeMutation.isPending}
				onAcknowledge={handleAcknowledge}
				onClose={() => setSelectedIncident(null)}
			/>
		</div>
	);
}

function StatusBadge({ incident }: { incident: Incident }) {
	const acknowledged = !!incident.admin_acknowledged_at;
	return (
		<Badge
			variant={acknowledged ? 'default' : 'destructive'}
			className={acknowledged ? 'bg-brand-aqua hover:opacity-90' : ''}>
			{acknowledged ? 'Acknowledged' : 'Pending'}
		</Badge>
	);
}

/** Nothing has been logged in this context at all — distinct from a filter miss. */
function EmptyLog({
	showAllCycles,
	onLogIncident,
	onIncludePastCycles,
}: {
	showAllCycles: boolean;
	onLogIncident: () => void;
	onIncludePastCycles: () => void;
}) {
	return (
		<div className="flex flex-col items-center gap-3 py-12 text-center">
			<span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-aqua/15">
				<ShieldAlert className="h-6 w-6 text-brand-teal" aria-hidden="true" />
			</span>
			<h3 className="text-lg font-semibold">
				{showAllCycles
					? 'No incidents have been recorded'
					: 'No incidents this cycle'}
			</h3>
			<p className="max-w-md text-sm text-muted-foreground">
				{showAllCycles
					? 'Nothing has been logged yet. Incidents you log will appear here.'
					: 'Nothing has been logged for children in the active registration cycle.'}
			</p>
			<div className="flex flex-wrap justify-center gap-2">
				<Button onClick={onLogIncident}>Log an incident</Button>
				{!showAllCycles && (
					<Button variant="outline" onClick={onIncludePastCycles}>
						Include past cycles
					</Button>
				)}
			</div>
		</div>
	);
}

/** There are incidents in context, but none match the active filters. */
function NoFilterMatches({
	onClearFilters,
	onLogIncident,
}: {
	onClearFilters: () => void;
	onLogIncident: () => void;
}) {
	return (
		<div className="flex flex-col items-center gap-3 py-12 text-center">
			<span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-aqua/15">
				<CheckCircle2 className="h-6 w-6 text-brand-teal" aria-hidden="true" />
			</span>
			<h3 className="text-lg font-semibold">
				No incidents match the current filter
			</h3>
			<p className="max-w-md text-sm text-muted-foreground">
				Incidents have been logged, but none match the filters you have
				applied. Clear them to see everything in this view.
			</p>
			<div className="flex flex-wrap justify-center gap-2">
				<Button onClick={onClearFilters}>Show all incidents</Button>
				<Button variant="outline" onClick={onLogIncident}>
					Log an incident
				</Button>
			</div>
		</div>
	);
}
