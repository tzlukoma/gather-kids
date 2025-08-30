'use client';

import { useLiveQuery } from 'dexie-react-hooks';
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
import { ChevronRight, Plus, Search, UserPlus, Users } from 'lucide-react';
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

	// Get all leaders if no search term, otherwise search
	const allLeaders = useLiveQuery(() => queryLeaderProfiles(), []);
	const searchResults = useLiveQuery(() => 
		searchTerm.trim() ? searchLeaderProfiles(searchTerm.trim()) : null, 
		[searchTerm]
	);

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

	const handleRowClick = (leaderId: string) => {
		router.push(`/dashboard/leaders/${leaderId}`);
	};

	const handleCreateNew = () => {
		setSelectedLeader(null);
		setIsDialogOpen(true);
	};

	const handleEditProfile = (leader: LeaderProfile, event: React.MouseEvent) => {
		event.stopPropagation(); // Prevent row click
		setSelectedLeader(leader);
		setIsDialogOpen(true);
	};

	if (loading || !isAuthorized) {
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
								Search and manage leader profiles. Click a row to edit memberships.
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
								<TableHead>Memberships</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{leaders.map((leader) => (
								<TableRow
									key={leader.leader_id}
									className="hover:bg-muted/50">
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
											onClick={(e) => handleEditProfile(leader, e)}
											className="h-8 px-2">
											Edit Profile
										</Button>
									</TableCell>
									<TableCell>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleRowClick(leader.leader_id)}
											className="h-8 px-2 flex items-center gap-1">
											<Users className="h-3 w-3" />
											Edit Ministries
										</Button>
									</TableCell>
								</TableRow>
							))}
							{leaders.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={7}
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
