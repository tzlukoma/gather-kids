'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	Loader2,
	UserCheck,
	UserX,
	Mail,
	Calendar,
	Shield,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuthUser {
	id: string;
	email: string;
	role: string;
	name: string;
	email_confirmed: boolean;
	last_sign_in: string | null;
	created_at: string;
	user_metadata: any;
}

export default function UsersManagementPage() {
	const { user } = useAuth();
	const { toast } = useToast();
	const [users, setUsers] = useState<AuthUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [promotingUser, setPromotingUser] = useState<string | null>(null);

	// Check if user is admin
	if (user?.metadata?.role !== AuthRole.ADMIN) {
		return (
			<div className="container mx-auto py-8">
				<Alert>
					<Shield className="h-4 w-4" />
					<AlertDescription>
						Access denied. This page is only available to administrators.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	useEffect(() => {
		loadUsers();
	}, []);

	const loadUsers = async () => {
		try {
			setLoading(true);
			setError(null);

			// Fetch users from API route
			const response = await fetch('/api/users');

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to fetch users');
			}

			const data = await response.json();
			setUsers(data.users);
		} catch (err) {
			console.error('Error loading users:', err);
			setError(err instanceof Error ? err.message : 'Failed to load users');
		} finally {
			setLoading(false);
		}
	};

	const promoteToAdmin = async (userId: string, userEmail: string) => {
		try {
			setPromotingUser(userId);

			// Update user role via API route
			const response = await fetch('/api/users', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: userId,
					role: 'ADMIN',
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to promote user');
			}

			// Update local state
			setUsers((prevUsers) =>
				prevUsers.map((u) => (u.id === userId ? { ...u, role: 'ADMIN' } : u))
			);

			toast({
				title: 'Success',
				description: `Successfully promoted ${userEmail} to ADMIN`,
			});
		} catch (err) {
			console.error('Error promoting user:', err);
			toast({
				title: 'Error',
				description:
					err instanceof Error ? err.message : 'Failed to promote user',
				variant: 'destructive',
			});
		} finally {
			setPromotingUser(null);
		}
	};

	const getRoleBadgeVariant = (role: string) => {
		switch (role) {
			case 'ADMIN':
				return 'destructive';
			case 'MINISTRY_LEADER':
				return 'default';
			case 'GUARDIAN':
				return 'secondary';
			case 'VOLUNTEER':
				return 'outline';
			default:
				return 'outline';
		}
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString();
	};

	if (loading) {
		return (
			<div className="container mx-auto py-8">
				<div className="flex items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin" />
					<span className="ml-2">Loading users...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold">User Management</h1>
				<p className="text-muted-foreground mt-2">
					Manage user accounts and roles in the system
				</p>
			</div>

			{error && (
				<Alert className="mb-6">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center">
						<UserCheck className="h-5 w-5 mr-2" />
						System Users ({users.length})
					</CardTitle>
					<CardDescription>
						View and manage all user accounts in the system
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Last Sign In</TableHead>
									<TableHead>Created</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{users.map((user) => (
									<TableRow key={user.id}>
										<TableCell className="font-medium">{user.name}</TableCell>
										<TableCell>
											<div className="flex items-center">
												<Mail className="h-4 w-4 mr-2 text-muted-foreground" />
												{user.email}
											</div>
										</TableCell>
										<TableCell>
											<Badge variant={getRoleBadgeVariant(user.role)}>
												{user.role}
											</Badge>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													user.email_confirmed ? 'default' : 'secondary'
												}>
												{user.email_confirmed ? 'Confirmed' : 'Unconfirmed'}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex items-center">
												<Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
												{formatDate(user.last_sign_in)}
											</div>
										</TableCell>
										<TableCell>{formatDate(user.created_at)}</TableCell>
										<TableCell>
											{user.role !== 'ADMIN' && (
												<Button
													size="sm"
													variant="outline"
													onClick={() => promoteToAdmin(user.id, user.email)}
													disabled={promotingUser === user.id}>
													{promotingUser === user.id ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<UserCheck className="h-4 w-4" />
													)}
													<span className="ml-2">Promote to Admin</span>
												</Button>
											)}
											{user.role === 'ADMIN' && (
												<Badge variant="destructive">Admin</Badge>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{users.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">
							<UserX className="h-12 w-12 mx-auto mb-4" />
							<p>No users found</p>
						</div>
					)}
				</CardContent>
			</Card>

			<div className="mt-6 text-sm text-muted-foreground">
				<p>
					<strong>Note:</strong> Only users with confirmed email addresses can
					be promoted to ADMIN. This action cannot be undone through this
					interface.
				</p>
			</div>
		</div>
	);
}
