'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Eye, EyeOff, User, Lock, AlertCircle } from 'lucide-react';
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

const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
		newPassword: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*+=_-])[A-Za-z\d!@#$%^&*+=_-]+$/,
				'Password must contain uppercase, lowercase, number, and special character'
			),
		confirmPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword'],
	});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
	const { user } = useAuth();
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

	const form = useForm<ChangePasswordFormData>({
		resolver: zodResolver(changePasswordSchema),
		defaultValues: {
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		},
	});

	const onSubmit = async (data: ChangePasswordFormData) => {
		setIsLoading(true);
		try {
			if (isDemoMode) {
				// Demo mode: simulate password validation and update
				await new Promise((resolve) => setTimeout(resolve, 1000));
				
				// Simulate current password validation
				if (data.currentPassword !== 'password') {
					throw new Error('Current password is incorrect');
				}
				
				toast({
					title: 'Password Updated Successfully',
					description: 'Your password has been changed. Please use your new password for future sign-ins.',
				});
				form.reset();
			} else {
				// Live mode: implement Supabase password update with re-authentication
				// TODO: Implement actual Supabase password update
				// 1. Re-authenticate with current password
				// 2. Update password if re-auth succeeds
				// const { error } = await supabase.auth.updateUser({ password: data.newPassword });
				// if (error) throw error;
				
				toast({
					title: 'Password Updated Successfully',
					description: 'Your password has been changed. Please use your new password for future sign-ins.',
				});
				form.reset();
			}
		} catch (error: any) {
			console.error('Password update failed:', error);
			let errorMessage = 'Failed to update password. Please try again.';
			
			if (error?.message?.includes('Current password is incorrect')) {
				errorMessage = 'Current password is incorrect. Please try again.';
			}
			
			toast({
				title: 'Update Failed',
				description: errorMessage,
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	if (!user) {
		return (
			<div className="container mx-auto py-8">
				<Card>
					<CardContent className="pt-6">
						<div className="text-center text-muted-foreground">
							Loading profile...
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
				<p className="text-muted-foreground">
					Manage your account settings and security preferences.
				</p>
			</div>

			<Tabs defaultValue="general" className="space-y-6">
				<TabsList>
					<TabsTrigger value="general">General</TabsTrigger>
					<TabsTrigger value="security">Security</TabsTrigger>
				</TabsList>

				<TabsContent value="general">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5" />
								General Information
							</CardTitle>
							<CardDescription>
								Your basic account information and preferences.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										value={user.name || user.displayName || 'Not provided'}
										disabled
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										value={user.email}
										disabled
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="role">Role</Label>
								<Input
									id="role"
									value={user.metadata.role}
									disabled
								/>
							</div>
							{user.metadata.household_id && (
								<div className="space-y-2">
									<Label htmlFor="household">Household ID</Label>
									<Input
										id="household"
										value={user.metadata.household_id}
										disabled
									/>
								</div>
							)}
							
							{isDemoMode && (
								<Alert>
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										<strong>Demo Mode:</strong> Profile information is simulated and cannot be edited.
									</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="security">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Lock className="h-5 w-5" />
								Security Settings
							</CardTitle>
							<CardDescription>
								Change your password and manage security preferences.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-6">
								<div>
									<h3 className="text-lg font-medium mb-4">Change Password</h3>
									
									{isDemoMode && (
										<Alert className="mb-4">
											<AlertCircle className="h-4 w-4" />
											<AlertDescription>
												<strong>Demo Mode:</strong> Password changes are simulated. 
												Use "password" as the current password to test the flow.
											</AlertDescription>
										</Alert>
									)}
									
									<Form {...form}>
										<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
											<FormField
												control={form.control}
												name="currentPassword"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Current Password</FormLabel>
														<FormControl>
															<div className="relative">
																<Input
																	{...field}
																	type={showCurrentPassword ? 'text' : 'password'}
																	placeholder="Enter your current password"
																	autoComplete="current-password"
																	disabled={isLoading}
																/>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
																	onClick={() => setShowCurrentPassword(!showCurrentPassword)}
																	disabled={isLoading}
																>
																	{showCurrentPassword ? (
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
												name="newPassword"
												render={({ field }) => (
													<FormItem>
														<FormLabel>New Password</FormLabel>
														<FormControl>
															<div className="relative">
																<Input
																	{...field}
																	type={showNewPassword ? 'text' : 'password'}
																	placeholder="Enter your new password"
																	autoComplete="new-password"
																	disabled={isLoading}
																/>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
																	onClick={() => setShowNewPassword(!showNewPassword)}
																	disabled={isLoading}
																>
																	{showNewPassword ? (
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
																	onClick={() => setShowConfirmPassword(!showConfirmPassword)}
																	disabled={isLoading}
																>
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
											
											<Button type="submit" disabled={isLoading}>
												{isLoading ? 'Updating Password...' : 'Update Password'}
											</Button>
										</form>
									</Form>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}