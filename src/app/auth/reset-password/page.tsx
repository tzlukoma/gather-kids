'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';

const resetPasswordSchema = z
	.object({
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*+=_-])[A-Za-z\d!@#$%^&*+=_-]+$/,
				'Password must contain uppercase, lowercase, number, and special character'
			),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords don&apos;t match',
		path: ['confirmPassword'],
	});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [hasValidToken, setHasValidToken] = useState<boolean | null>(null);

	const form = useForm<ResetPasswordFormData>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: {
			password: '',
			confirmPassword: '',
		},
	});

	useEffect(() => {
		const token = searchParams.get('token');
		const code = searchParams.get('code');

		if (token || code) {
			validateResetToken(token, code);
		} else {
			setHasValidToken(false);
		}
	}, [searchParams]);

	const validateResetToken = async (
		token: string | null,
		code: string | null
	) => {
		try {
			if (!token && !code) {
				setHasValidToken(false);
				return;
			}

			const {
				data: { session },
				error: sessionError,
			} = await supabase.auth.getSession();

			if (sessionError) {
				console.error('Session validation failed:', sessionError);
				setHasValidToken(false);
				return;
			}

			if (session?.user) {
				setHasValidToken(true);
			} else {
				setHasValidToken(false);
			}
		} catch (error) {
			console.error('Reset token validation failed:', error);
			setHasValidToken(false);
		}
	};

	const onSubmit = async (data: ResetPasswordFormData) => {
		setIsLoading(true);
		try {
			const { error } = await supabase.auth.updateUser({
				password: data.password,
			});

			if (error) {
				throw error;
			}

			toast({
				title: 'Password Reset Successful',
				description:
					'Your password has been updated successfully. You can now sign in with your new password.',
			});
			router.push('/login');
		} catch (error) {
			console.error('Password reset failed:', error);
			toast({
				title: 'Reset Failed',
				description:
					'Failed to reset password. Please try again or request a new reset link.',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	if (hasValidToken === null) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-muted/50">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
						<CardTitle>Validating Reset Link</CardTitle>
						<CardDescription>
							Please wait while we verify your reset link...
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (hasValidToken === false) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-muted/50">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
						<CardTitle>Invalid Reset Link</CardTitle>
						<CardDescription>
							This password reset link is invalid, expired, or has already been
							used.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								Please request a new password reset link from the sign-in page.
							</AlertDescription>
						</Alert>
						<Button
							className="w-full mt-4"
							onClick={() => router.push('/login')}>
							Return to Sign In
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-muted/50">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<Lock className="h-12 w-12 text-primary mx-auto mb-4" />
					<CardTitle>Reset Your Password</CardTitle>
					<CardDescription>
						Enter your new password below. Make sure it&apos;s strong and
						secure.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>New Password</FormLabel>
										<FormControl>
											<div className="relative">
												<Input
													{...field}
													type={showPassword ? 'text' : 'password'}
													placeholder="Enter your new password"
													autoComplete="new-password"
													disabled={isLoading}
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
													onClick={() => setShowPassword(!showPassword)}
													aria-label={showPassword ? 'Hide password' : 'Show password'}
													disabled={isLoading}>
													{showPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="confirmPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Confirm New Password</FormLabel>
										<FormControl>
											<div className="relative">
												<Input
													{...field}
													type={showConfirmPassword ? 'text' : 'password'}
													placeholder="Confirm your new password"
													autoComplete="new-password"
													disabled={isLoading}
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
													onClick={() =>
														setShowConfirmPassword(!showConfirmPassword)
													}
													aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
													disabled={isLoading}>
													{showConfirmPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? 'Updating Password...' : 'Update Password'}
							</Button>
						</form>
					</Form>

					<div className="mt-4 text-center">
						<Button
							variant="link"
							onClick={() => router.push('/login')}
							disabled={isLoading}>
							Back to Sign In
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-screen bg-muted/50">
					<Card className="w-full max-w-md">
						<CardHeader className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
							<CardTitle>Loading...</CardTitle>
							<CardDescription>
								Preparing password reset form...
							</CardDescription>
						</CardHeader>
					</Card>
				</div>
			}>
			<ResetPasswordForm />
		</Suspense>
	);
}
