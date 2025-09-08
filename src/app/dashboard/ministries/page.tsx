'use client';

import type { Ministry, RegistrationCycle } from '@/lib/types';
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
import { PlusCircle, Edit, Trash2, Calendar } from 'lucide-react';
import { MinistryFormDialog } from '@/components/gatherKids/ministry-form-dialog';
import RegistrationCycles from '@/components/gatherKids/registration-cycles';
import { deleteMinistry, getMinistries } from '@/lib/dal';
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
}: {
	title: string;
	description: string;
	ministries: (Ministry & { email?: string | null })[];
	onEdit: (ministry: Ministry) => void;
	onDelete: (ministryId: string) => void;
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
							<TableHead>Status</TableHead>
							<TableHead>Eligibility</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{ministries.map((m) => (
							<TableRow key={m.ministry_id}>
								<TableCell className="font-medium">{m.name}</TableCell>
								<TableCell>
									<Badge variant="outline">{m.code}</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground">
									{m.email ?? '—'}
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
						))}
						{ministries.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={6}
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

export default function MinistryPage() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);
	const [activeTab, setActiveTab] = useState<string>('ministries');
	const [allMinistries, setAllMinistries] = useState<Ministry[]>([]);
	const [isLoadingData, setIsLoadingData] = useState(true);
	const { toast } = useToast();

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);

	// Load data when authorized
	useEffect(() => {
		if (isAuthorized) {
			const loadData = async () => {
				try {
					const ministries = await getMinistries();
					setAllMinistries(ministries);
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
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="inline-flex items-center gap-2">
					<TabsTrigger value="ministries">Ministries</TabsTrigger>
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
					/>

					<MinistryTable
						title="Expressed Interest Activities"
						description="These are activities to gauge interest, but do not create an official enrollment."
						ministries={interestPrograms}
						onEdit={handleEdit}
						onDelete={handleDelete}
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
		</div>
	);
}
