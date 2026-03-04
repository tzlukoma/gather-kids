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
import { useUpdateUser } from '@/hooks/data/users';
import { useToast } from '@/hooks/use-toast';

const MIN_PASSWORD_LENGTH = 8;

interface SetPasswordDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId: string;
	userEmail: string;
	currentUserId: string;
}

export function SetPasswordDialog({
	open,
	onOpenChange,
	userId,
	userEmail,
	currentUserId,
}: SetPasswordDialogProps) {
	const { toast } = useToast();
	const updateUser = useUpdateUser();
	const [password, setPassword] = useState('');
	const [confirmSelf, setConfirmSelf] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	const isSelf = userId === currentUserId;

	const resetForm = () => {
		setPassword('');
		setConfirmSelf(false);
		setValidationError(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setValidationError(null);

		if (password.length < MIN_PASSWORD_LENGTH) {
			setValidationError('Password must be at least 8 characters');
			return;
		}
		if (isSelf && !confirmSelf) {
			setValidationError('Please confirm that you understand you will be signed out.');
			return;
		}

		try {
			await updateUser.mutateAsync({ userId, password });
			toast({
				title: 'Success',
				description: 'Password updated successfully',
			});
			resetForm();
			onOpenChange(false);
		} catch (err) {
			toast({
				title: 'Error',
				description: err instanceof Error ? err.message : 'Failed to update password',
				variant: 'destructive',
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Set Password</DialogTitle>
					<DialogDescription>
						Set a new password for {userEmail}.
						{isSelf && (
							<span className="mt-2 block text-amber-600 dark:text-amber-500">
								Changing your own password will sign you out. Continue?
							</span>
						)}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4" noValidate>
					{validationError && (
						<p className="text-sm text-destructive" role="alert">
							{validationError}
						</p>
					)}
					<div className="space-y-2">
						<Label htmlFor="set-password-input">New password</Label>
						<Input
							id="set-password-input"
							type="password"
							placeholder="Min 8 characters"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={MIN_PASSWORD_LENGTH}
							autoComplete="new-password"
						/>
					</div>
					{isSelf && (
						<div className="flex items-center space-x-2">
							<Checkbox
								id="set-password-confirm-self"
								checked={confirmSelf}
								onCheckedChange={(checked) => setConfirmSelf(checked === true)}
								aria-label="I understand I will be signed out"
							/>
							<Label htmlFor="set-password-confirm-self" className="text-sm font-normal cursor-pointer">
								I understand I will be signed out
							</Label>
						</div>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={updateUser.isPending || (isSelf && !confirmSelf)}
						>
							{updateUser.isPending ? 'Saving…' : 'Set Password'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
