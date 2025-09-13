'use client';

import type { Ministry, RegistrationCycle, MinistryGroup } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Calendar, Users, Settings } from 'lucide-react';
import { MinistryFormDialog } from '@/components/gatherKids/ministry-form-dialog';
import { MinistryGroupFormDialog } from '@/components/gatherKids/ministry-group-form-dialog';
import { MinistryAssignmentDialog } from '@/components/gatherKids/ministry-assignment-dialog';
import RegistrationCycles from '@/components/gatherKids/registration-cycles';
import { deleteMinistry, getMinistries, getMinistryGroups, deleteMinistryGroup, getMinistriesInGroup, getGroupsForMinistry } from '@/lib/dal';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { AuthRole } from '@/lib/auth-types';

function MinistryTable({
	title,
	description,
	ministries,
	onEdit,
	onDelete,
	groupsForMinistries,
}: {
	title: string;
	description: string;
	ministries: (Ministry & { email?: string | null })[];
	onEdit: (ministry: Ministry) => void;
	onDelete: (ministryId: string) => void;
	groupsForMinistries?: Map<string, MinistryGroup[]>;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-headline">{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Code</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Groups</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Eligibility</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{ministries.map((m) => {
							const groups = groupsForMinistries?.get(m.ministry_id) || [];
							return (
								<TableRow key={m.ministry_id}>
									<TableCell className="font-medium">{m.name}</TableCell>
									<TableCell>
										<Badge variant="outline">{m.code}</Badge>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{m.email ?? '—'}
									</TableCell>
									<TableCell>
										{groups.length > 0 ? (
											<div className="flex flex-wrap gap-1">
												{groups.map((group) => (
													<Badge
														key={group.id}
														variant="secondary"
														className="text-xs"
													>
														{group.name}
													</Badge>
												))}
											</div>
										) : (
											<span className="text-muted-foreground text-sm">—</span>
										)}
									</TableCell>
									<TableCell>
										<Badge
											variant={m.is_active ? 'default' : 'secondary'}
											className={m.is_active ? 'bg-brand-aqua' : ''}>
											{m.is_active ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
									<TableCell>
										{m.min_age || m.max_age
											? `Ages ${m.min_age ?? '?'} - ${m.max_age ?? '?'}`
											: 'All ages'}
									</TableCell>
									<TableCell className="text-right">
										<Button variant="ghost" size="icon" onClick={() => onEdit(m)}>
											<Edit className="h-4 w-4" />
										</Button>
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="text-destructive hover:text-destructive">
													<Trash2 className="h-4 w-4" />
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Are you sure?</AlertDialogTitle>
													<AlertDialogDescription>
														This action cannot be undone. This will permanently
														delete the ministry.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction
														onClick={() => onDelete(m.ministry_id)}
														className="bg-destructive hover:bg-destructive/90">
														Delete
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</TableCell>
								</TableRow>
							);
						})}
						{ministries.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={7}
									className="text-center h-24 text-muted-foreground">
									No ministries of this type found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function MinistryGroupTable({
	groups,
	onEdit,
	onDelete,
	onAssignMinistries,
	ministriesInGroups,
}: {
	groups: MinistryGroup[];
	onEdit: (group: MinistryGroup) => void;
	onDelete: (groupId: string) => void;
	onAssignMinistries: (group: MinistryGroup) => void;
	ministriesInGroups?: Map<string, Ministry[]>;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-headline">Ministry Groups</CardTitle>
				<CardDescription>
					Organize ministries into groups for easier management and group-level permissions.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Code</TableHead>
							<TableHead>Ministries</TableHead>
							<TableHead>Description</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{groups.map((group) => {
							const ministries = ministriesInGroups?.get(group.id) || [];
							return (
								<TableRow key={group.id}>
									<TableCell className="font-medium">{group.name}</TableCell>
									<TableCell>
										<Badge variant="outline">{group.code}</Badge>
									</TableCell>
									<TableCell>
										{ministries.length > 0 ? (
											<div className="flex flex-wrap gap-1 max-w-xs">
												{ministries.map((ministry) => (
													<Badge
														key={ministry.ministry_id}
														variant="secondary"
														className="text-xs"
													>
														{ministry.name}
													</Badge>
												))}
											</div>
										) : (
											<span className="text-muted-foreground text-sm">No ministries</span>
										)}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{group.description || '—'}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{format(new Date(group.created_at), 'MMM d, yyyy')}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => onAssignMinistries(group)}
											title="Assign Ministries"
										>
											<Users className="h-4 w-4" />
										</Button>
										<Button 
											variant="ghost" 
											size="icon" 
											onClick={() => onEdit(group)}
											title="Edit Group"
										>
											<Edit className="h-4 w-4" />
										</Button>
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="text-destructive hover:text-destructive"
													title="Delete Group"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Are you sure?</AlertDialogTitle>
													<AlertDialogDescription>
														This action cannot be undone. This will permanently delete the 
														ministry group "{group.name}" and all its assignments.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction
														onClick={() => onDelete(group.id)}
														className="bg-destructive hover:bg-destructive/90">
														Delete Group
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</TableCell>
								</TableRow>
							);
						})}
						{groups.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center h-24 text-muted-foreground">
									No ministry groups found. Create your first group to get started.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

export default function MinistryPage() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);
	const [activeTab, setActiveTab] = useState<string>('ministries');
	const [allMinistries, setAllMinistries] = useState<Ministry[]>([]);
	const [ministryGroups, setMinistryGroups] = useState<MinistryGroup[]>([]);
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [ministriesInGroups, setMinistriesInGroups] = useState<Map<string, Ministry[]>>(new Map());
	const [groupsForMinistries, setGroupsForMinistries] = useState<Map<string, MinistryGroup[]>>(new Map());
	const { toast } = useToast();

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);
	
	// Ministry Group dialogs
	const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
	const [editingGroup, setEditingGroup] = useState<MinistryGroup | null>(null);
	const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
	const [assigningGroup, setAssigningGroup] = useState<MinistryGroup | null>(null);

	// Load data when authorized
	useEffect(() => {
		if (isAuthorized) {
			const loadData = async () => {
				try {
					const [ministries, groups] = await Promise.all([
						getMinistries(),
						getMinistryGroups()
					]);
					setAllMinistries(ministries);
					setMinistryGroups(groups);

					// Load relationship data
					const ministriesInGroupsMap = new Map<string, Ministry[]>();
					const groupsForMinistriesMap = new Map<string, MinistryGroup[]>();

					// Get ministries for each group
					for (const group of groups) {
						try {
							const groupMinistries = await getMinistriesInGroup(group.id);
							ministriesInGroupsMap.set(group.id, groupMinistries);
						} catch (error) {
							console.warn(`Failed to load ministries for group ${group.id}:`, error);
							ministriesInGroupsMap.set(group.id, []);
						}
					}

					// Get groups for each ministry
					for (const ministry of ministries) {
						try {
							const ministryGroups = await getGroupsForMinistry(ministry.ministry_id);
							groupsForMinistriesMap.set(ministry.ministry_id, ministryGroups);
						} catch (error) {
							console.warn(`Failed to load groups for ministry ${ministry.ministry_id}:`, error);
							groupsForMinistriesMap.set(ministry.ministry_id, []);
						}
					}

					setMinistriesInGroups(ministriesInGroupsMap);
					setGroupsForMinistries(groupsForMinistriesMap);
				} catch (error) {
					console.error('Error loading ministry data:', error);
					toast({
						title: 'Error',
						description: 'Failed to load ministry data',
						variant: 'destructive',
					});
				} finally {
					setIsLoadingData(false);
				}
			};

			loadData();
		}
	}, [isAuthorized, toast]);

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
				setIsAdmin(true);
			}
		}
	}, [user, loading, router]);

	const { enrolledPrograms, interestPrograms } = useMemo(() => {
		if (!allMinistries) return { enrolledPrograms: [], interestPrograms: [] };

		const enrolled = allMinistries
			.filter(
				(m) =>
					m.enrollment_type === 'enrolled' && !m.code.startsWith('min_sunday')
			)
			.sort((a, b) => a.name.localeCompare(b.name));
		const interest = allMinistries
			.filter((m) => m.enrollment_type === 'expressed_interest')
			.sort((a, b) => a.name.localeCompare(b.name));
		return { enrolledPrograms: enrolled, interestPrograms: interest };
	}, [allMinistries]);

	const handleAddNew = () => {
		setEditingMinistry(null);
		setIsDialogOpen(true);
	};

	const handleEdit = (ministry: Ministry) => {
		setEditingMinistry(ministry);
		setIsDialogOpen(true);
	};

	const handleDelete = async (ministryId: string) => {
		try {
			await deleteMinistry(ministryId);
			toast({
				title: 'Ministry Deleted',
				description: 'The ministry has been successfully deleted.',
			});

			// Reload data
			const ministries = await getMinistries();
			setAllMinistries(ministries);
		} catch (error) {
			console.error('Failed to delete ministry', error);
			toast({
				title: 'Error Deleting Ministry',
				description: 'Could not delete the ministry. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const handleMinistryUpdated = async () => {
		console.log('🔍 MinistryPage: Refreshing ministries list after update');
		try {
			const ministries = await getMinistries();
			setAllMinistries(ministries);

			// Refresh groups for ministries
			const groupsForMinistriesMap = new Map<string, MinistryGroup[]>();
			for (const ministry of ministries) {
				try {
					const ministryGroups = await getGroupsForMinistry(ministry.ministry_id);
					groupsForMinistriesMap.set(ministry.ministry_id, ministryGroups);
				} catch (error) {
					console.warn(`Failed to load groups for ministry ${ministry.ministry_id}:`, error);
					groupsForMinistriesMap.set(ministry.ministry_id, []);
				}
			}
			setGroupsForMinistries(groupsForMinistriesMap);

			console.log('✅ MinistryPage: Ministries list refreshed successfully');
		} catch (error) {
			console.error(
				'❌ MinistryPage: Failed to refresh ministries list',
				error
			);
			toast({
				title: 'Error',
				description: 'Failed to refresh ministry data',
				variant: 'destructive',
			});
		}
	};

	// Ministry Group handlers
	const handleAddNewGroup = () => {
		setEditingGroup(null);
		setIsGroupDialogOpen(true);
	};

	const handleEditGroup = (group: MinistryGroup) => {
		setEditingGroup(group);
		setIsGroupDialogOpen(true);
	};

	const handleDeleteGroup = async (groupId: string) => {
		try {
			await deleteMinistryGroup(groupId);
			toast({
				title: 'Group Deleted',
				description: 'The ministry group has been successfully deleted.',
			});

			// Reload groups
			const groups = await getMinistryGroups();
			setMinistryGroups(groups);
		} catch (error) {
			console.error('Failed to delete ministry group', error);
			toast({
				title: 'Error Deleting Group',
				description: 'Could not delete the ministry group. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const handleAssignMinistries = (group: MinistryGroup) => {
		setAssigningGroup(group);
		setIsAssignmentDialogOpen(true);
	};

	const handleGroupUpdated = async () => {
		console.log('🔍 MinistryPage: Refreshing groups list after update');
		try {
			const groups = await getMinistryGroups();
			setMinistryGroups(groups);

			// Refresh ministries in groups
			const ministriesInGroupsMap = new Map<string, Ministry[]>();
			for (const group of groups) {
				try {
					const groupMinistries = await getMinistriesInGroup(group.id);
					ministriesInGroupsMap.set(group.id, groupMinistries);
				} catch (error) {
					console.warn(`Failed to load ministries for group ${group.id}:`, error);
					ministriesInGroupsMap.set(group.id, []);
				}
			}
			setMinistriesInGroups(ministriesInGroupsMap);

			// Also refresh groups for ministries since assignments may have changed
			const groupsForMinistriesMap = new Map<string, MinistryGroup[]>();
			for (const ministry of allMinistries) {
				try {
					const ministryGroups = await getGroupsForMinistry(ministry.ministry_id);
					groupsForMinistriesMap.set(ministry.ministry_id, ministryGroups);
				} catch (error) {
					console.warn(`Failed to load groups for ministry ${ministry.ministry_id}:`, error);
					groupsForMinistriesMap.set(ministry.ministry_id, []);
				}
			}
			setGroupsForMinistries(groupsForMinistriesMap);

			console.log('✅ MinistryPage: Groups list refreshed successfully');
		} catch (error) {
			console.error(
				'❌ MinistryPage: Failed to refresh groups list',
				error
			);
			toast({
				title: 'Error',
				description: 'Failed to refresh groups data',
				variant: 'destructive',
			});
		}
	};

	if (loading || !isAuthorized || isLoadingData) {
		return <div>Loading configuration...</div>;
	}

	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold font-headline">Ministries</h1>
					<p className="text-muted-foreground">
						Manage the ministries and activities available for registration.
					</p>
				</div>
				{activeTab === 'ministries' && (
					<Button onClick={handleAddNew}>
						<PlusCircle className="mr-2" />
						Add New Program
					</Button>
				)}
				{activeTab === 'groups' && (
					<Button onClick={handleAddNewGroup}>
						<PlusCircle className="mr-2" />
						Add New Group
					</Button>
				)}
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="inline-flex items-center gap-2">
					<TabsTrigger value="ministries">Ministries</TabsTrigger>
					<TabsTrigger value="groups">Ministry Groups</TabsTrigger>
					{isAdmin && (
						<TabsTrigger value="registration-cycles">
							Registration Cycles
						</TabsTrigger>
					)}
				</TabsList>

				<TabsContent value="ministries" className="space-y-8 mt-6">
					<MinistryTable
						title="Ministry Programs"
						description="These are programs children can be officially enrolled in."
						ministries={enrolledPrograms}
						onEdit={handleEdit}
						onDelete={handleDelete}
						groupsForMinistries={groupsForMinistries}
					/>

					<MinistryTable
						title="Expressed Interest Activities"
						description="These are activities to gauge interest, but do not create an official enrollment."
						ministries={interestPrograms}
						onEdit={handleEdit}
						onDelete={handleDelete}
						groupsForMinistries={groupsForMinistries}
					/>
				</TabsContent>

				<TabsContent value="groups" className="mt-6">
					<MinistryGroupTable
						groups={ministryGroups}
						onEdit={handleEditGroup}
						onDelete={handleDeleteGroup}
						onAssignMinistries={handleAssignMinistries}
						ministriesInGroups={ministriesInGroups}
					/>
				</TabsContent>

				{isAdmin && (
					<TabsContent value="registration-cycles" className="mt-6">
						<Card>
							<CardHeader>
								<CardTitle>Registration Cycles</CardTitle>
								<CardDescription>
									Manage registration cycles for ministries and activities
								</CardDescription>
							</CardHeader>
							<CardContent>
								<RegistrationCycles />
							</CardContent>
						</Card>
					</TabsContent>
				)}
			</Tabs>

			<MinistryFormDialog
				isOpen={isDialogOpen}
				onCloseAction={() => setIsDialogOpen(false)}
				ministry={editingMinistry}
				onMinistryUpdated={handleMinistryUpdated}
			/>
			
			<MinistryGroupFormDialog
				isOpen={isGroupDialogOpen}
				onCloseAction={() => setIsGroupDialogOpen(false)}
				group={editingGroup}
				onGroupUpdated={handleGroupUpdated}
			/>
			
			<MinistryAssignmentDialog
				isOpen={isAssignmentDialogOpen}
				onCloseAction={() => setIsAssignmentDialogOpen(false)}
				group={assigningGroup}
				onAssignmentUpdated={handleGroupUpdated}
			/>
		</div>
	);
}
