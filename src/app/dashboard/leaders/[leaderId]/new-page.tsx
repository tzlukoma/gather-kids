'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useParams, useRouter } from 'next/navigation';
import {
	getLeaderProfileWithMemberships,
	saveLeaderMemberships,
	updateLeaderProfileStatus,
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
import { Mail, Phone, User, CheckCircle2, ShieldQuestion, ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import type { MinistryLeaderMembership, LeaderProfile, Ministry } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import Link from 'next/link';

const InfoItem = ({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: React.ReactNode;
}) => (
	<div className="flex items-center gap-3">
		<div className="text-muted-foreground">{icon}</div>
		<div>
			<div className="text-sm font-medium">{label}</div>
			<div className="text-muted-foreground">{value}</div>
		</div>
	</div>
);

type AssignmentState = {
	[ministryId: string]: {
		assigned: boolean;
		role: 'PRIMARY' | 'VOLUNTEER';
	};
};

export default function LeaderProfilePage() {
	const params = useParams();
	const router = useRouter();
	const leaderId = params.leaderId as string;
	const { user, loading } = useAuth();
	const { toast } = useToast();
	
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [assignments, setAssignments] = useState<AssignmentState>({});
	const [isActive, setIsActive] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	// Get leader profile with memberships
	const profileData = useLiveQuery(() => getLeaderProfileWithMemberships(leaderId), [leaderId]);

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
			
			// Initialize all ministries as unassigned
			profileData.allMinistries.forEach((m) => {
				initialAssignments[m.ministry_id] = {
					assigned: false,
					role: 'VOLUNTEER',
				};
			});

			// Set existing memberships
			profileData.memberships.forEach((membership) => {
				if (membership.ministry) {
					initialAssignments[membership.ministry_id] = {
						assigned: membership.is_active,
						role: membership.role_type,
					};
				}
			});

			setAssignments(initialAssignments);
			setIsActive(profileData.profile?.is_active ?? false);
		}
	}, [profileData]);

	// Check if leader has any active assignments
	const hasAssignments = useMemo(() => {
		return Object.values(assignments).some(a => a.assigned);
	}, [assignments]);

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
		role: 'PRIMARY' | 'VOLUNTEER'
	) => {
		setAssignments((prev) => ({
			...prev,
			[ministryId]: { ...prev[ministryId], role },
		}));
	};

	const handleSaveChanges = async () => {
		if (!profileData) return;

		setIsSaving(true);
		try {
			const finalMemberships: Omit<MinistryLeaderMembership, 'membership_id' | 'created_at' | 'updated_at'>[] =
				Object.entries(assignments)
					.filter(([, val]) => val.assigned)
					.map(([ministryId, val]) => ({
						leader_id: leaderId,
						ministry_id: ministryId,
						role_type: val.role,
						is_active: true,
					}));

			await saveLeaderMemberships(leaderId, finalMemberships);
			
			toast({
				title: 'Memberships Updated',
				description: 'Leader ministry memberships have been saved successfully.',
			});
		} catch (error) {
			console.error('Failed to save memberships', error);
			toast({
				title: 'Save Failed',
				description: 'Could not update the leader memberships.',
				variant: 'destructive',
			});
		}
		setIsSaving(false);
	};

	const handleStatusChange = async (newStatus: boolean) => {
		if (!profileData) return;
		
		try {
			await updateLeaderProfileStatus(leaderId, newStatus);
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
		return profileData.memberships
			.filter(m => m.is_active && m.ministry)
			.map((membership) => ({
				...membership,
				ministryName: membership.ministry?.name || 'Unknown',
			}))
			.sort((a, b) => a.ministryName.localeCompare(b.ministryName));
	}, [profileData]);

	if (loading || !isAuthorized || !profileData) {
		return <div>Loading leader profile...</div>;
	}

	if (!profileData.profile) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
				<h2 className="text-xl font-semibold">Leader Profile Not Found</h2>
				<p className="text-muted-foreground">The requested leader profile does not exist.</p>
				<Button asChild>
					<Link href="/dashboard/leaders/directory">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Leader Directory
					</Link>
				</Button>
			</div>
		);
	}

	const leader = profileData.profile;

	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center gap-4">
				<Button variant="outline" size="sm" asChild>
					<Link href="/dashboard/leaders/directory">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Directory
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-bold font-headline">
						{leader.first_name} {leader.last_name}
					</h1>
					<p className="text-muted-foreground">Leader Profile & Ministry Memberships</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Leader Profile Card */}
				<Card>
					<CardHeader>
						<CardTitle className="font-headline flex items-center gap-2">
							<User className="h-5 w-5" />
							Leader Profile
						</CardTitle>
						<CardDescription>
							Basic information about this leader
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Status</span>
							<div className="flex items-center gap-2">
								<Switch
									checked={isActive}
									onCheckedChange={(checked) => {
										if (!checked || hasAssignments) {
											setIsActive(checked);
											handleStatusChange(checked);
										}
									}}
									disabled={!isActive && !hasAssignments}
								/>
								<Badge
									variant={isActive ? 'default' : 'secondary'}
									className={isActive ? 'bg-green-500' : ''}>
									{isActive ? 'Active' : 'Inactive'}
								</Badge>
							</div>
						</div>

						<Separator />

						<div className="space-y-3">
							<InfoItem
								icon={<User className="h-4 w-4" />}
								label="Full Name"
								value={`${leader.first_name} ${leader.last_name}`}
							/>

							{leader.email && (
								<InfoItem
									icon={<Mail className="h-4 w-4" />}
									label="Email"
									value={leader.email}
								/>
							)}

							{leader.phone && (
								<InfoItem
									icon={<Phone className="h-4 w-4" />}
									label="Phone"
									value={leader.phone}
								/>
							)}

							{leader.notes && (
								<div>
									<div className="text-sm font-medium">Notes</div>
									<div className="text-sm text-muted-foreground mt-1 p-2 bg-muted rounded">
										{leader.notes}
									</div>
								</div>
							)}
						</div>

						{!hasAssignments && (
							<Alert>
								<ShieldQuestion className="h-4 w-4" />
								<AlertTitle>No Ministry Memberships</AlertTitle>
								<AlertDescription>
									This leader is not currently assigned to any ministries and is automatically inactive.
								</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>

				{/* Current Memberships Card */}
				<Card>
					<CardHeader>
						<CardTitle className="font-headline">Current Ministry Memberships</CardTitle>
						<CardDescription>
							Active ministry assignments for this leader
						</CardDescription>
					</CardHeader>
					<CardContent>
						{assignedMinistries.length > 0 ? (
							<div className="space-y-3">
								{assignedMinistries.map((membership) => (
									<div
										key={membership.membership_id}
										className="flex items-center justify-between p-3 border rounded-lg">
										<div>
											<div className="font-medium">{membership.ministryName}</div>
											<div className="text-sm text-muted-foreground">
												Role: {membership.role_type}
											</div>
										</div>
										<Badge variant="outline" className="bg-green-50">
											<CheckCircle2 className="h-3 w-3 mr-1" />
											Active
										</Badge>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								No active ministry memberships.
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Ministry Assignment Section */}
			<Card>
				<CardHeader>
					<CardTitle className="font-headline">Edit Ministry Memberships</CardTitle>
					<CardDescription>
						Assign this leader to ministries and set their role type
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{profileData.allMinistries.map((ministry) => {
						const assignment = assignments[ministry.ministry_id];
						if (!assignment) return null;

						return (
							<div key={ministry.ministry_id} className="p-4 border rounded-lg">
								<div className="flex items-start gap-4">
									<Checkbox
										id={`ministry-${ministry.ministry_id}`}
										checked={assignment.assigned}
										onCheckedChange={(checked) =>
											handleAssignmentChange(ministry.ministry_id, checked as boolean)
										}
									/>
									<div className="flex-1">
										<Label
											htmlFor={`ministry-${ministry.ministry_id}`}
											className="text-sm font-medium cursor-pointer">
											{ministry.name}
										</Label>
										{ministry.description && (
											<p className="text-sm text-muted-foreground mt-1">
												{ministry.description}
											</p>
										)}

										{assignment.assigned && (
											<div className="mt-3">
												<Label className="text-sm font-medium">Role Type</Label>
												<RadioGroup
													value={assignment.role}
													onValueChange={(value) =>
														handleRoleChange(ministry.ministry_id, value as 'PRIMARY' | 'VOLUNTEER')
													}
													className="flex gap-6 mt-2">
													<div className="flex items-center space-x-2">
														<RadioGroupItem value="PRIMARY" id={`${ministry.ministry_id}-primary`} />
														<Label htmlFor={`${ministry.ministry_id}-primary`}>Primary</Label>
													</div>
													<div className="flex items-center space-x-2">
														<RadioGroupItem value="VOLUNTEER" id={`${ministry.ministry_id}-volunteer`} />
														<Label htmlFor={`${ministry.ministry_id}-volunteer`}>Volunteer</Label>
													</div>
												</RadioGroup>
											</div>
										)}
									</div>
								</div>
							</div>
						);
					})}

					<div className="flex justify-end">
						<Button onClick={handleSaveChanges} disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save Memberships'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}