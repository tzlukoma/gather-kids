'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

type Props = {
	onSuccess?: () => void;
	onError?: (err: unknown) => void;
};

export default function PasswordSetup({ onSuccess, onError }: Props) {
	const { toast } = useToast();
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	const submit = async () => {
		if (password !== confirmPassword) {
			toast({
				title: 'Password Mismatch',
				description: 'Passwords do not match. Please try again.',
				variant: 'destructive',
			});
			return;
		}
		if (password.length < 6) {
			toast({
				title: 'Password Too Short',
				description: 'Password must be at least 6 characters long.',
				variant: 'destructive',
			});
			return;
		}

		setLoading(true);
		try {
			const { error: passwordError } = await supabase.auth.updateUser({
				password,
			});
			if (passwordError) throw passwordError;

			const { error: metadataError } = await supabase.auth.updateUser({
				data: { has_password: true, onboarding_dismissed: true },
			});
			if (metadataError) throw metadataError;

			toast({
				title: 'Password Set Successfully',
				description: 'You can now sign in with your email and password.',
			});
			onSuccess?.();
		} catch (err: unknown) {
			console.error('Error setting password:', err);
			let message = 'Failed to set password. Please try again.';
			if (typeof err === 'object' && err !== null && 'message' in err) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				message = (err as { message?: string }).message ?? message;
			}
			toast({
				title: 'Error Setting Password',
				description: message,
				variant: 'destructive',
			});
			onError?.(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				<Label htmlFor="password">New Password</Label>
				<div className="relative">
					<Input
						id="password"
						type={showPassword ? 'text' : 'password'}
						placeholder="Enter your password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="pr-10"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
						onClick={() => setShowPassword(!showPassword)}>
						{showPassword ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</Button>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="confirmPassword">Confirm Password</Label>
				<Input
					id="confirmPassword"
					type="password"
					placeholder="Confirm your password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
				/>
			</div>

			<div className="flex gap-2">
				<Button onClick={submit} disabled={loading}>
					{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
					Set Password
				</Button>
			</div>
		</div>
	);
}
