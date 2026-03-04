'use client';

import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { AuthRole } from '@/lib/auth-types';
import { useCreateUser } from '@/hooks/data/users';
import { useToast } from '@/hooks/use-toast';

const MIN_PASSWORD_LENGTH = 8;
const ROLES = Object.values(AuthRole);

interface CreateUserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
	const { toast } = useToast();
	const createUser = useCreateUser();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [fullName, setFullName] = useState('');
	const [role, setRole] = useState<string>(AuthRole.GUEST);
	const [emailConfirm, setEmailConfirm] = useState(true);
	const [validationError, setValidationError] = useState<string | null>(null);

	const resetForm = () => {
		setEmail('');
		setPassword('');
		setFullName('');
		setRole(AuthRole.GUEST);
		setEmailConfirm(true);
		setValidationError(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setValidationError(null);

		const trimmedEmail = email.trim();
		if (!trimmedEmail) {
			setValidationError('Email is required');
			return;
		}
		if (!password) {
			setValidationError('Password is required');
			return;
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			setValidationError('Password must be at least 8 characters');
			return;
		}

		try {
			await createUser.mutateAsync({
				email: trimmedEmail,
				password,
				full_name: fullName.trim() || undefined,
				role,
				email_confirm: emailConfirm,
			});
			toast({
				title: 'Success',
				description: 'User created successfully',
			});
			resetForm();
			onOpenChange(false);
		} catch (err) {
			toast({
				title: 'Error',
				description: err instanceof Error ? err.message : 'Failed to create user',
				variant: 'destructive',
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Create User</DialogTitle>
					<DialogDescription>
						Add a new user to the system. They can sign in with the email and password you set.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4" noValidate>
					{validationError && (
						<p className="text-sm text-destructive" role="alert">
							{validationError}
						</p>
					)}
					<div className="space-y-2">
						<Label htmlFor="create-user-email">Email</Label>
						<Input
							id="create-user-email"
							type="email"
							placeholder="user@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoComplete="email"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="create-user-password">Password</Label>
						<Input
							id="create-user-password"
							type="password"
							placeholder="Min 8 characters"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={MIN_PASSWORD_LENGTH}
							autoComplete="new-password"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="create-user-fullname">Full name (optional)</Label>
						<Input
							id="create-user-fullname"
							type="text"
							placeholder="Display name"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							autoComplete="name"
						/>
					</div>
					<div className="space-y-2">
						<Label id="create-user-role-label">Role</Label>
						<Select value={role} onValueChange={setRole}>
							<SelectTrigger aria-labelledby="create-user-role-label" aria-label="Role">
								<SelectValue placeholder="Select role" />
							</SelectTrigger>
							<SelectContent>
								{ROLES.map((r) => (
									<SelectItem key={r} value={r}>
										{r}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-center space-x-2">
						<Checkbox
							id="create-user-email-confirm"
							checked={emailConfirm}
							onCheckedChange={(checked) => setEmailConfirm(checked === true)}
							aria-label="Mark email as confirmed"
						/>
						<Label htmlFor="create-user-email-confirm" className="text-sm font-normal cursor-pointer">
							Mark email as confirmed
						</Label>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={createUser.isPending}>
							{createUser.isPending ? 'Creating…' : 'Create User'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
