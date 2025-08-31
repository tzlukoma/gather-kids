'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Mail, AlertCircle } from 'lucide-react';
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

const forgotPasswordSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordDialogProps {
	children: React.ReactNode;
}

export function ForgotPasswordDialog({ children }: ForgotPasswordDialogProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [emailSent, setEmailSent] = useState(false);
	const { toast } = useToast();

	const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';

	const form = useForm<ForgotPasswordFormData>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: {
			email: '',
		},
	});

	const onSubmit = async (data: ForgotPasswordFormData) => {
		setIsLoading(true);
		try {
			if (isDemoMode) {
				// Demo mode: simulate email sending
				await new Promise((resolve) => setTimeout(resolve, 1000));
				setEmailSent(true);
				toast({
					title: 'Reset Link Sent (Demo)',
					description: `Password reset instructions have been sent to ${data.email}. In demo mode, you can visit the reset page directly.`,
				});
			} else {
				// Live mode: send actual reset email via Supabase
				// TODO: Implement actual Supabase password reset
				// const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
				//   redirectTo: `${siteUrl}/auth/reset-password`,
				// });
				// if (error) throw error;
				
				setEmailSent(true);
				toast({
					title: 'Reset Link Sent',
					description: `If an account exists for ${data.email}, you will receive password reset instructions.`,
				});
			}
		} catch (error) {
			console.error('Password reset request failed:', error);
			toast({
				title: 'Request Failed',
				description: 'Failed to send reset email. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		setOpen(false);
		setEmailSent(false);
		form.reset();
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<Mail className="h-8 w-8 text-primary mx-auto mb-2" />
					<DialogTitle className="text-center">
						{emailSent ? 'Check Your Email' : 'Forgot Your Password?'}
					</DialogTitle>
					<DialogDescription className="text-center">
						{emailSent
							? "We've sent password reset instructions to your email address."
							: 'Enter your email address and we\'ll send you a link to reset your password.'}
					</DialogDescription>
				</DialogHeader>

				{emailSent ? (
					<div className="py-4">
						<Alert>
							<Mail className="h-4 w-4" />
							<AlertDescription>
								Check your email for a password reset link. If you don't see it, check your spam folder.
							</AlertDescription>
						</Alert>
						
						{isDemoMode && (
							<Alert className="mt-4">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									<strong>Demo Mode:</strong> You can test the reset flow by visiting{' '}
									<a 
										href="/auth/reset-password" 
										className="underline text-primary"
										onClick={handleClose}
									>
										the reset page directly
									</a>.
								</AlertDescription>
							</Alert>
						)}
					</div>
				) : (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email Address</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="email"
												placeholder="Enter your email address"
												autoComplete="email"
												disabled={isLoading}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							
							{isDemoMode && (
								<Alert>
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										<strong>Demo Mode:</strong> Password reset is simulated. Any valid email format will work.
									</AlertDescription>
								</Alert>
							)}
						</form>
					</Form>
				)}

				<DialogFooter className="sm:justify-between">
					<Button
						type="button"
						variant="outline"
						onClick={handleClose}
						disabled={isLoading}
					>
						{emailSent ? 'Close' : 'Cancel'}
					</Button>
					{!emailSent && (
						<Button
							type="submit"
							onClick={form.handleSubmit(onSubmit)}
							disabled={isLoading}
						>
							{isLoading ? 'Sending...' : 'Send Reset Link'}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}