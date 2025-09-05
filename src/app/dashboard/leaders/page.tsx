'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { queryLeaderProfiles, searchLeaderProfiles, migrateLeadersIfNeeded } from '@/lib/dal';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Plus, Search, UserPlus, User } from 'lucide-react';
import type { LeaderProfile } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { LeaderProfileDialog } from './leader-profile-dialog';
import { useToast } from '@/hooks/use-toast';

export default function LeadersPage() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const { toast } = useToast();
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [selectedLeader, setSelectedLeader] = useState<LeaderProfile | null>(null);
	const [isMigrationComplete, setIsMigrationComplete] = useState(false);

	// State management for data loading
	const [allLeaders, setAllLeaders] = useState<LeaderProfile[]>([]);
	const [searchResults, setSearchResults] = useState<LeaderProfile[] | null>(null);
	const [dataLoading, setDataLoading] = useState(true);

	// Load leaders data
	useEffect(() => {
		const loadLeaders = async () => {
			try {
				setDataLoading(true);
				console.log('Loading leaders data...');
				if (searchTerm.trim()) {
					console.log('Searching leaders with term:', searchTerm.trim());
					const results = await searchLeaderProfiles(searchTerm.trim());
					console.log('Search results:', results);
					setSearchResults(results);
				} else {
					console.log('Loading all leaders...');
					const leaders = await queryLeaderProfiles();
					console.log('All leaders loaded:', leaders);
					setAllLeaders(leaders);
					setSearchResults(null);
				}
			} catch (error) {
				console.error('Error loading leaders:', error);
				// Show error message to user
				toast({
					title: 'Failed to Load Leaders',
					description: 'There was an error loading leader data. Please try refreshing the page.',
					variant: 'destructive',
				});
			} finally {
				setDataLoading(false);
			}
		};

		loadLeaders();
	}, [searchTerm, toast]);

	// Use search results if available, otherwise all leaders
	const leaders = searchResults || allLeaders || [];

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

	// Run migration check when authorized
	useEffect(() => {
		if (isAuthorized && !isMigrationComplete) {
			migrateLeadersIfNeeded()
				.then((migrated) => {
					if (migrated) {
						toast({
							title: "Leaders Migrated",
							description: "Existing leaders have been migrated to the new system.",
						});
					}
					setIsMigrationComplete(true);
				})
				.catch((error) => {
					console.error('Migration failed:', error);
					setIsMigrationComplete(true); // Don't block UI
				});
		}
	}, [isAuthorized, isMigrationComplete, toast]);

	const handleEditProfile = (leaderId: string) => {
		router.push(`/dashboard/leaders/${leaderId}`);
	};

	const handleCreateNew = () => {
		setSelectedLeader(null);
		setIsDialogOpen(true);
	};

	if (loading || !isAuthorized || dataLoading) {
		return <div>Loading leaders...</div>;
	}

	return (
		<div className="flex flex-col gap-8">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-3xl font-bold font-headline">Leaders</h1>
					<p className="text-muted-foreground">
						Manage leader profiles and their ministry memberships.
					</p>
				</div>
				<Button onClick={handleCreateNew} className="flex items-center gap-2">
					<UserPlus className="h-4 w-4" />
					Add Leader
				</Button>
			</div>

			<Card>
				<CardHeader>
					<div className="flex justify-between items-center">
						<div>
							<CardTitle className="font-headline">All Leader Profiles</CardTitle>
							<CardDescription>
								Search and manage leader profiles. Click a row or button to edit profile and ministry assignments.
							</CardDescription>
						</div>
						<div className="flex items-center gap-2 w-80">
							<Search className="h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by name or email..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="flex-1"
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Ministries</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{leaders.map((leader) => (
								<TableRow
									key={leader.leader_id}
									className="hover:bg-muted/50 cursor-pointer"
									onClick={() => handleEditProfile(leader.leader_id)}>
									<TableCell className="font-medium">
										{leader.first_name} {leader.last_name}
									</TableCell>
									<TableCell>{leader.email || '—'}</TableCell>
									<TableCell>{leader.phone || '—'}</TableCell>
									<TableCell>
										<Badge
											variant={leader.is_active ? 'default' : 'secondary'}
											className={leader.is_active ? 'bg-green-500' : ''}>
											{leader.is_active ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<span className="text-sm text-muted-foreground">
												{leader.ministryCount} {leader.ministryCount === 1 ? 'ministry' : 'ministries'}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<Button
											variant="outline"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												handleEditProfile(leader.leader_id);
											}}
											className="h-8 px-3 flex items-center gap-1">
											<User className="h-3 w-3" />
											Edit Profile
										</Button>
									</TableCell>
								</TableRow>
							))}
							{leaders.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={6}
										className="text-center h-24 text-muted-foreground">
										{searchTerm.trim() ? 'No leaders found matching your search.' : 'No leader profiles found.'}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<LeaderProfileDialog 
				leader={selectedLeader}
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
			/>
		</div>
	);
}
