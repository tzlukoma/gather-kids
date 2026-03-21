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
	UserPlus,
	Mail,
	Calendar,
	Shield,
	KeyRound,
	MailCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUsers, useUpdateUser } from '@/hooks/data/users';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { SetPasswordDialog } from '@/components/admin/set-password-dialog';

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

	// Use React Query hooks for data fetching
	const { data: users = [], isLoading, error } = useUsers();
	const updateUserMutation = useUpdateUser();

	const [promotingUser, setPromotingUser] = useState<string | null>(null);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [setPasswordUser, setSetPasswordUser] = useState<{ id: string; email: string } | null>(null);

	// Handle errors from React Query (must be before any early return)
	useEffect(() => {
		if (error) {
			console.error('Error loading users:', error);
		}
	}, [error]);

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

	const promoteToAdmin = async (userId: string, userEmail: string) => {
		try {
			setPromotingUser(userId);
			await updateUserMutation.mutateAsync({ userId, role: AuthRole.ADMIN });
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

	const handleConfirmEmail = async (userId: string, userEmail: string) => {
		try {
			await updateUserMutation.mutateAsync({ userId, email_confirmed: true });
			toast({
				title: 'Success',
				description: `Email confirmed for ${userEmail}`,
			});
		} catch (err) {
			toast({
				title: 'Error',
				description: err instanceof Error ? err.message : 'Failed to confirm email',
				variant: 'destructive',
			});
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

	if (isLoading) {
		return <TableSkeleton rows={8} columns={6} />;
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<div className="flex items-center gap-2">
					<h1 className="text-3xl font-bold">User Management</h1>
					<Badge
						variant="secondary"
						className="text-xs bg-blue-100 text-blue-800 border border-blue-200">
						Beta
					</Badge>
				</div>
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
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<div>
						<CardTitle className="flex items-center">
							<UserCheck className="h-5 w-5 mr-2" />
							System Users ({users.length})
						</CardTitle>
						<CardDescription>
							View and manage all user accounts in the system
						</CardDescription>
					</div>
					<Button onClick={() => setCreateDialogOpen(true)}>
						<UserPlus className="h-4 w-4 mr-2" />
						Create User
					</Button>
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
											<div className="flex flex-wrap gap-2">
												<Button
													size="sm"
													variant="outline"
													onClick={() => setSetPasswordUser({ id: user.id, email: user.email })}
													aria-label={`Set password for ${user.email}`}>
													<KeyRound className="h-4 w-4 mr-1" />
													Set Password
												</Button>
												{!user.email_confirmed && (
													<Button
														size="sm"
														variant="outline"
														onClick={() => handleConfirmEmail(user.id, user.email)}
														disabled={updateUserMutation.isPending}>
														<MailCheck className="h-4 w-4 mr-1" />
														Confirm Email
													</Button>
												)}
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
											</div>
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

			<CreateUserDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
			{setPasswordUser && (
				<SetPasswordDialog
					open={!!setPasswordUser}
					onOpenChange={(open) => !open && setSetPasswordUser(null)}
					userId={setPasswordUser.id}
					userEmail={setPasswordUser.email}
					currentUserId={user?.id || user?.uid || ''}
				/>
			)}
		</div>
	);
}
