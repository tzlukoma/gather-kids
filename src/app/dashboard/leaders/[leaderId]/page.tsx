'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useParams, useRouter } from 'next/navigation';
import {
	getLeaderProfile,
	saveLeaderAssignments,
	updateLeaderStatus,
} from '@/lib/dal';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, User, CheckCircle2, ShieldQuestion } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import type { LeaderAssignment, User as LeaderUser } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { getLeaderBibleBeeProgress } from '@/lib/dal';
import Link from 'next/link';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/select';
import { db } from '@/lib/db';

const InfoItem = ({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: React.ReactNode;
}) => (
	<div className="flex items-start gap-3">
		<div className="text-muted-foreground mt-1">{icon}</div>
		<div>
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="font-medium">{value}</p>
		</div>
	</div>
);

type AssignmentState = {
	[ministryId: string]: {
		assigned: boolean;
		role: 'Primary' | 'Volunteer';
	};
};

export default function LeaderProfilePage() {
	const params = useParams();
	const router = useRouter();
	const { user, loading } = useAuth();
	const [isAuthorized, setIsAuthorized] = useState(false);

	const leaderId = params.leaderId as string;
	const { toast } = useToast();

	const profileData = useLiveQuery(
		() => getLeaderProfile(leaderId, '2025'),
		[leaderId]
	);

	const [assignments, setAssignments] = useState<AssignmentState>({});
	const [isSaving, setIsSaving] = useState(false);
	const [isActive, setIsActive] = useState(true);

	const hasAssignments = useMemo(() => {
		return Object.values(assignments).some((a) => a.assigned);
	}, [assignments]);

	useEffect(() => {
		if (!loading && user) {
			if (user?.metadata?.role !== AuthRole.ADMIN) {
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

	useEffect(() => {
		if (profileData) {
			const initialAssignments: AssignmentState = {};
			profileData.allMinistries.forEach((m) => {
				const existingAssignment = profileData.assignments.find(
					(a) => a.ministry_id === m.ministry_id
				);
				initialAssignments[m.ministry_id] = {
					assigned: !!existingAssignment,
					role: existingAssignment?.role || 'Volunteer',
				};
			});
			setAssignments(initialAssignments);
			setIsActive(profileData.leader?.is_active ?? false);
		}
	}, [profileData]);

	// Effect to enforce inactive status if no assignments exist
	useEffect(() => {
		if (!hasAssignments && isActive) {
			setIsActive(false);
			handleStatusChange(false);
		}
	}, [hasAssignments, isActive]);

	const handleAssignmentChange = (ministryId: string, checked: boolean) => {
		setAssignments((prev) => ({
			...prev,
			[ministryId]: { ...prev[ministryId], assigned: checked },
		}));
	};

	const handleRoleChange = (
		ministryId: string,
		role: 'Primary' | 'Volunteer'
	) => {
		setAssignments((prev) => ({
			...prev,
			[ministryId]: { ...prev[ministryId], role },
		}));
	};

	const handleSaveChanges = async () => {
		setIsSaving(true);
		try {
			const finalAssignments: Omit<LeaderAssignment, 'assignment_id'>[] =
				Object.entries(assignments)
					.filter(([, val]) => val.assigned)
					.map(([ministryId, val]) => ({
						leader_id: leaderId,
						ministry_id: ministryId,
						cycle_id: '2025',
						role: val.role,
					}));
			await saveLeaderAssignments(leaderId, '2025', finalAssignments);

			// If assignments were updated and there are none, force inactive
			if (finalAssignments.length === 0 && isActive) {
				await handleStatusChange(false);
				toast({
					title: 'Assignments Saved & Status Updated',
					description:
						"The leader's assignments have been updated and status set to inactive.",
				});
			} else {
				toast({
					title: 'Assignments Saved',
					description: "The leader's ministry assignments have been updated.",
				});
			}
		} catch (error) {
			console.error('Failed to save assignments', error);
			toast({
				title: 'Save Failed',
				description: 'Could not save assignments. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleStatusChange = async (newStatus: boolean) => {
		setIsActive(newStatus);
		try {
			await updateLeaderStatus(leaderId, newStatus);
			toast({
				title: 'Status Updated',
				description: `Leader has been set to ${
					newStatus ? 'Active' : 'Inactive'
				}.`,
			});
		} catch (error) {
			console.error('Failed to update status', error);
			toast({
				title: 'Status Update Failed',
				description: "Could not update the leader's status.",
				variant: 'destructive',
			});
			// Revert optimistic UI update
			setIsActive(!newStatus);
		}
	};

	const assignedMinistries = useMemo(() => {
		if (!profileData) return [];
		return profileData.assignments
			.map((assignment) => {
				const ministry = profileData.allMinistries.find(
					(m) => m.ministry_id === assignment.ministry_id
				);
				return {
					...assignment,
					ministryName: ministry?.name || 'Unknown',
				};
			})
			.sort((a, b) => a.ministryName.localeCompare(b.ministryName));
	}, [profileData]);

	if (loading || !isAuthorized || !profileData) {
		return <div>Loading leader profile...</div>;
	}

	const { leader, allMinistries } = profileData;

	if (!leader) {
		return <div>Leader not found.</div>;
	}

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-bold font-headline">{leader.name}</h1>
				<div className="flex items-center gap-2 mt-2 flex-wrap">
					<Badge
						variant={isActive ? 'default' : 'secondary'}
						className={isActive ? 'bg-green-500' : ''}>
						{isActive ? 'Active' : 'Inactive'}
					</Badge>
					{assignedMinistries.map((a) => (
						<Badge key={a.assignment_id} variant="outline">
							{a.ministryName}
						</Badge>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-1 h-fit">
					<CardHeader>
						<CardTitle className="font-headline flex items-center gap-2">
							<User /> Leader Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
							<div className="space-y-0.5">
								<Label htmlFor="leader-status" className="font-medium">
									Leader Status
								</Label>
								<p className="text-xs text-muted-foreground">
									{isActive ? 'Active leader' : 'Inactive leader'}
								</p>
							</div>
							<Switch
								id="leader-status"
								checked={isActive}
								onCheckedChange={handleStatusChange}
								disabled={!hasAssignments && !isActive}
							/>
						</div>
						<InfoItem
							icon={<Mail size={16} />}
							label="Email"
							value={leader.email}
						/>
						<InfoItem
							icon={<Phone size={16} />}
							label="Phone"
							value={leader.mobile_phone || 'N/A'}
						/>
						<Separator />
						<InfoItem
							icon={<CheckCircle2 size={16} />}
							label="Background Check"
							value={leader.background_check_status || 'N/A'}
						/>
					</CardContent>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="font-headline flex items-center gap-2">
							Ministry Assignments
						</CardTitle>
						<CardDescription>
							Select the ministries this leader is assigned to for the 2025
							cycle.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{!hasAssignments && (
							<Alert variant="destructive">
								<ShieldQuestion className="h-4 w-4" />
								<AlertTitle>No Assignments</AlertTitle>
								<AlertDescription>
									This leader has no ministry assignments and has been
									automatically set to inactive. Assign at least one ministry to
									make them active.
								</AlertDescription>
							</Alert>
						)}
						{allMinistries.map((ministry) => (
							<div
								key={ministry.ministry_id}
								className="p-4 border rounded-md flex flex-col md:flex-row justify-between md:items-center gap-4">
								<div className="flex items-start gap-3">
									<Checkbox
										id={`min-${ministry.ministry_id}`}
										checked={
											assignments[ministry.ministry_id]?.assigned || false
										}
										onCheckedChange={(checked) =>
											handleAssignmentChange(ministry.ministry_id, !!checked)
										}
									/>
									<Label
										htmlFor={`min-${ministry.ministry_id}`}
										className="font-medium text-base">
										{ministry.name}
									</Label>
								</div>
								{assignments[ministry.ministry_id]?.assigned && (
									<RadioGroup
										value={assignments[ministry.ministry_id]?.role}
										onValueChange={(role: 'Primary' | 'Volunteer') =>
											handleRoleChange(ministry.ministry_id, role)
										}
										className="flex gap-4 pl-7 md:pl-0">
										<div className="flex items-center space-x-2">
											<RadioGroupItem
												value="Primary"
												id={`role-primary-${ministry.ministry_id}`}
											/>
											<Label htmlFor={`role-primary-${ministry.ministry_id}`}>
												Primary
											</Label>
										</div>
										<div className="flex items-center space-x-2">
											<RadioGroupItem
												value="Volunteer"
												id={`role-volunteer-${ministry.ministry_id}`}
											/>
											<Label htmlFor={`role-volunteer-${ministry.ministry_id}`}>
												Volunteer
											</Label>
										</div>
									</RadioGroup>
								)}
							</div>
						))}

						<div className="flex justify-end pt-4">
							<Button onClick={handleSaveChanges} disabled={isSaving}>
								{isSaving ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="font-headline">Bible Bee Progress</CardTitle>
					<CardDescription>
						Read-only progress for children assigned to your ministries.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{typeof leader.user_id === 'string' ? (
						<LeaderBibleBeeProgress
							leaderId={leader.user_id}
							cycleId={'2025'}
						/>
					) : (
						<div>No Bible Bee data available.</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function LeaderBibleBeeProgress({
	leaderId,
	cycleId,
}: {
	leaderId: string;
	cycleId: string;
}) {
	const [rows, setRows] = useState<any[] | null>(null);
	const [filterGradeGroup, setFilterGradeGroup] = useState<string | 'all'>(
		'all'
	);
	const [filterStatus, setFilterStatus] = useState<
		'all' | 'Not Started' | 'In-Progress' | 'Complete'
	>('all');
	const [availableGradeGroups, setAvailableGradeGroups] = useState<string[]>(
		[]
	);

	// cycle selection
	const competitionYears = useLiveQuery(
		() => db.competitionYears.orderBy('year').reverse().toArray(),
		[]
	);
	const [selectedCycle, setSelectedCycle] = useState<string>(cycleId);

	// sorting
	const [sortBy, setSortBy] = useState<
		'name-asc' | 'name-desc' | 'progress-desc' | 'progress-asc'
	>('name-asc');

	useEffect(() => {
		// initialize selected cycle when competition years load
		if (competitionYears && competitionYears.length > 0) {
			// default to the newest year if not explicitly provided
			const defaultYear = String(competitionYears[0].year);
			setSelectedCycle((prev) => prev || defaultYear);
		}
	}, [competitionYears]);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			const res = await getLeaderBibleBeeProgress(leaderId, selectedCycle);
			if (mounted) {
				setRows(res);
				// collect grade groups
				const groups = new Set<string>();
				res.forEach((r: any) => {
					if (r.gradeGroup) groups.add(r.gradeGroup);
				});
				setAvailableGradeGroups(Array.from(groups).sort());
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, [leaderId, selectedCycle]);

	if (!rows) return <div>Loading Bible Bee progress...</div>;

	if (rows.length === 0)
		return <div>No children enrolled in Bible Bee for this cycle.</div>;

	const filtered = rows.filter((r: any) => {
		if (filterGradeGroup !== 'all') {
			if (r.gradeGroup !== filterGradeGroup) return false;
		}
		if (filterStatus !== 'all') return r.bibleBeeStatus === filterStatus;
		return true;
	});

	const withProgress = filtered.map((r: any) => {
		const denom = r.requiredScriptures || r.totalScriptures || 1;
		const pct = denom === 0 ? 0 : (r.completedScriptures / denom) * 100;
		return { ...r, progressPct: pct };
	});

	const sorted = withProgress.sort((a: any, b: any) => {
		switch (sortBy) {
			case 'name-asc':
				return a.childName.localeCompare(b.childName);
			case 'name-desc':
				return b.childName.localeCompare(a.childName);
			case 'progress-desc':
				return b.progressPct - a.progressPct;
			case 'progress-asc':
				return a.progressPct - b.progressPct;
			default:
				return 0;
		}
	});

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-4 mb-2">
				<div className="w-48">
					<Select onValueChange={(v: any) => setSelectedCycle(String(v))}>
						<SelectTrigger>
							<SelectValue>{selectedCycle || cycleId}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{(competitionYears || []).map((y: any) => (
								<SelectItem key={y.id} value={String(y.year)}>
									{String(y.year)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="w-56">
					<Select onValueChange={(v: any) => setFilterGradeGroup(v as any)}>
						<SelectTrigger>
							<SelectValue>
								{filterGradeGroup === 'all'
									? 'All Grade Groups'
									: filterGradeGroup}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={'all'}>All Grade Groups</SelectItem>
							{availableGradeGroups.map((g) => (
								<SelectItem key={g} value={g}>
									{g}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="w-48">
					<Select onValueChange={(v: any) => setSortBy(v as any)}>
						<SelectTrigger>
							<SelectValue>
								{sortBy === 'name-asc' && 'Name (A → Z)'}
								{sortBy === 'name-desc' && 'Name (Z → A)'}
								{sortBy === 'progress-desc' && 'Progress (High → Low)'}
								{sortBy === 'progress-asc' && 'Progress (Low → High)'}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={'name-asc'}>Name (A → Z)</SelectItem>
							<SelectItem value={'name-desc'}>Name (Z → A)</SelectItem>
							<SelectItem value={'progress-desc'}>
								Progress (High → Low)
							</SelectItem>
							<SelectItem value={'progress-asc'}>
								Progress (Low → High)
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center gap-2">
					<button
						className={`px-3 py-1 rounded ${
							filterStatus === 'all' ? 'bg-accent' : ''
						}`}
						onClick={() => setFilterStatus('all')}>
						All
					</button>
					<button
						className={`px-3 py-1 rounded ${
							filterStatus === 'Not Started' ? 'bg-accent' : ''
						}`}
						onClick={() => setFilterStatus('Not Started')}>
						Not Started
					</button>
					<button
						className={`px-3 py-1 rounded ${
							filterStatus === 'In-Progress' ? 'bg-accent' : ''
						}`}
						onClick={() => setFilterStatus('In-Progress')}>
						In-Progress
					</button>
					<button
						className={`px-3 py-1 rounded ${
							filterStatus === 'Complete' ? 'bg-accent' : ''
						}`}
						onClick={() => setFilterStatus('Complete')}>
						Complete
					</button>
				</div>
			</div>
			{sorted.map((r: any) => (
				<div
					key={r.childId}
					className="p-3 border rounded-md flex items-center justify-between">
					<div>
						<div className="font-medium">
							<Link href={`/household/children/${r.childId}`}>
								{r.childName}
							</Link>
						</div>
						<div className="text-sm text-muted-foreground">
							Scriptures: {r.completedScriptures}/{r.totalScriptures} — Essay:{' '}
							{r.essayStatus}
						</div>
						<div className="text-xs text-muted-foreground">
							Grade Group: {r.gradeGroup || 'N/A'} — Ministries:{' '}
							{(r.ministries || []).map((m: any) => m.ministryName).join(', ')}
						</div>
					</div>
					<div className="text-sm text-muted-foreground">
						{Math.round(r.progressPct)}%
					</div>
				</div>
			))}
		</div>
	);
}
