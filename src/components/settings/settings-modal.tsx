'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
	Upload,
	User,
	Eye,
	EyeOff,
	Loader2,
	Mail,
	AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getMeProfile, saveProfile, getActiveProfileTarget } from '@/lib/dal';
import { supabase } from '@/lib/supabaseClient';
import { isDemo } from '@/lib/authGuards';
import { SquareCropperModal } from '@/components/ui/square-cropper-modal';

const profileSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	phone: z.string().optional(),
});

const passwordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
		newPassword: z
			.string()
			.min(6, 'Password must be at least 6 characters long'),
		confirmPassword: z.string().min(1, 'Please confirm your password'),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword'],
	});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	defaultTab?: 'profile' | 'security';
}

export function SettingsModal({
	isOpen,
	onClose,
	defaultTab = 'profile',
}: SettingsModalProps) {
	const { user } = useAuth();
	const { toast } = useToast();
	const [activeTab, setActiveTab] = useState(defaultTab);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [profileTarget, setProfileTarget] = useState<{
		target_table: string;
		target_id: string;
	} | null>(null);
	const [pendingEmailChange, setPendingEmailChange] = useState<string | null>(
		null
	);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [showCropper, setShowCropper] = useState(false);
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);

	const profileForm = useForm<ProfileFormValues>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			email: '',
			phone: '',
		},
	});

	const passwordForm = useForm<PasswordFormValues>({
		resolver: zodResolver(passwordSchema),
		defaultValues: {
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		},
	});

	// Load profile data when modal opens
	useEffect(() => {
		if (isOpen && user) {
			loadProfileData();
		}
	}, [isOpen, user]);

	const loadProfileData = async () => {
		if (!user) return;

		setLoading(true);
		try {
			// Get the active profile target
			const target = await getActiveProfileTarget(user.uid || user.id || '');
			setProfileTarget(target);

			// Get profile data
			const profile = await getMeProfile(user.uid || user.id || '', user.email);

			// Always use the authenticated user's email as primary, fallback to profile email
			const emailToUse = user.email || profile?.email || '';

			profileForm.reset({
				email: emailToUse,
				phone: profile?.phone || '',
			});

			// Set avatar preview if available
			if (profile?.photo_url || profile?.avatar_path) {
				setAvatarPreview(profile.photo_url || profile.avatar_path || null);
			}
		} catch (error) {
			console.error('Error loading profile:', error);
			toast({
				title: 'Error Loading Profile',
				description: 'Failed to load your profile information.',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const handleAvatarUpload = () => {
		setShowCropper(true);
	};

	const handleAvatarSave = async (croppedBlob: Blob, croppedDataUrl: string) => {
		try {
			// Convert blob to File object for consistency
			const file = new File([croppedBlob], 'avatar.webp', {
				type: croppedBlob.type,
				lastModified: Date.now(),
			});

			setAvatarFile(file);
			setAvatarPreview(croppedDataUrl);

			toast({
				title: 'Avatar Updated',
				description: 'Your profile photo has been updated. Remember to save your changes.',
			});
		} catch (error) {
			console.error('Error processing avatar:', error);
			toast({
				title: 'Error',
				description: 'Failed to process the avatar. Please try again.',
				variant: 'destructive',
			});
			throw error;
		}
	};

	const handleProfileSave = async (data: ProfileFormValues) => {
		if (!user || saving) return;

		setSaving(true);
		try {
			let photoPath: string | undefined;

			// Handle avatar upload if there's a new file
			if (avatarFile) {
				try {
					if (isDemo()) {
						// In demo mode, the preview already contains the processed image
						photoPath = avatarPreview;
					} else {
						// In production mode, upload via API
						const formData = new FormData();
						formData.append('file', avatarFile, 'avatar.webp');
						formData.append('userData', JSON.stringify(user));

						const response = await fetch('/api/me/photo', {
							method: 'POST',
							body: formData,
						});

						if (!response.ok) {
							const errorData = await response.json();
							throw new Error(errorData.error || 'Failed to upload avatar');
						}

						const { photoUrl } = await response.json();
						photoPath = photoUrl;
					}
				} catch (error: any) {
					throw new Error(`Avatar upload failed: ${error.message}`);
				}
			}

			// Handle email change - only initiate Supabase email change, don't update domain yet
			let shouldUpdateDomainEmail = false;
			if (data.email !== user.email && !isDemo()) {
				try {
					const { error: emailError } = await supabase.auth.updateUser({
						email: data.email,
					});

					if (emailError) {
						throw new Error(`Email change failed: ${emailError.message}`);
					}

					// Set pending email change state
					setPendingEmailChange(data.email);

					toast({
						title: 'Verification Email Sent',
						description: `We sent a verification link to ${data.email}. Your profile will update after you confirm.`,
					});
				} catch (error: any) {
					throw new Error(`Email change failed: ${error.message}`);
				}
			} else if (data.email !== user.email && isDemo()) {
				// In demo mode, allow immediate email update
				shouldUpdateDomainEmail = true;
			}

			// Save to domain tables
			await saveProfile(user.uid || user.id || '', {
				email: shouldUpdateDomainEmail ? data.email : undefined,
				phone: data.phone,
				photoPath,
			});

			toast({
				title: 'Profile Updated',
				description: 'Your profile has been saved successfully.',
			});

			// Clear avatar file after successful save
			setAvatarFile(null);
		} catch (error: any) {
			console.error('Error saving profile:', error);
			toast({
				title: 'Error Saving Profile',
				description:
					error.message || 'Failed to save your profile. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	const handlePasswordChange = async (data: PasswordFormValues) => {
		if (!user || saving) return;

		setSaving(true);
		try {
			// In demo mode, just show success
			if (isDemo()) {
				toast({
					title: 'Password Updated',
					description: 'Your password has been changed successfully.',
				});
				passwordForm.reset();
				return;
			}

			// Update password in Supabase
			const { error } = await supabase.auth.updateUser({
				password: data.newPassword,
			});

			if (error) {
				throw new Error(error.message);
			}

			toast({
				title: 'Password Updated',
				description: 'Your password has been changed successfully.',
			});

			passwordForm.reset();
		} catch (error: any) {
			console.error('Error changing password:', error);
			toast({
				title: 'Error Changing Password',
				description:
					error.message || 'Failed to change password. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	const handlePasswordReset = async () => {
		if (!user?.email || saving) return;

		setSaving(true);
		try {
			if (isDemo()) {
				toast({
					title: 'Demo Mode',
					description: 'Password reset emails are not sent in demo mode.',
				});
				return;
			}

			const { error } = await supabase.auth.resetPasswordForEmail(user.email);

			if (error) {
				throw new Error(error.message);
			}

			toast({
				title: 'Password Reset Email Sent',
				description: 'Check your email for password reset instructions.',
			});
		} catch (error: any) {
			console.error('Error sending password reset:', error);
			toast({
				title: 'Error Sending Reset Email',
				description:
					error.message || 'Failed to send reset email. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	const removeAvatar = () => {
		setAvatarFile(null);
		setAvatarPreview(null);
	};

	if (!user) return null;

	const getUserInitials = () => {
		const name = user.displayName || user.name || user.email || '';
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	const isProfileDirty = profileForm.formState.isDirty || avatarFile !== null;
	const isPasswordDirty = passwordForm.formState.isDirty;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
					<DialogDescription>
						Manage your profile and security settings
					</DialogDescription>
				</DialogHeader>

				<Tabs
					value={activeTab}
					onValueChange={(v: string) =>
						setActiveTab(v as 'profile' | 'security')
					}>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="profile">Profile</TabsTrigger>
						<TabsTrigger value="security">Security</TabsTrigger>
					</TabsList>

					<TabsContent value="profile" className="space-y-6">
						{loading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin" />
							</div>
						) : (
							<form
								onSubmit={profileForm.handleSubmit(handleProfileSave)}
								className="space-y-6">
								{/* Profile Target Info */}
								{profileTarget && (
									<Alert>
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											{profileTarget.target_table === 'ministry_leaders'
												? 'Updating your ministry leader profile.'
												: 'Updating your household profile.'}
										</AlertDescription>
									</Alert>
								)}

								{/* Avatar Section */}
								<Card>
									<CardHeader>
										<CardTitle>Profile Photo</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="flex items-center gap-4">
											<Avatar className="h-20 w-20">
												<AvatarImage src={avatarPreview || undefined} />
												<AvatarFallback>
													<User className="h-8 w-8" />
												</AvatarFallback>
											</Avatar>
											<div className="space-y-2">
												<div className="flex gap-2">
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={handleAvatarUpload}>
														<Upload className="h-4 w-4 mr-2" />
														{avatarPreview ? 'Replace' : 'Upload'}
													</Button>
													{avatarPreview && (
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={removeAvatar}>
															Remove
														</Button>
													)}
												</div>
												<p className="text-xs text-muted-foreground">
													Max file size: 10MB. Supported formats: JPG, PNG, WebP
												</p>
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Email & Phone Section */}
								<Card>
									<CardHeader>
										<CardTitle>Contact Information</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{pendingEmailChange && (
											<Alert>
												<Mail className="h-4 w-4" />
												<AlertDescription>
													We sent a verification link to{' '}
													<strong>{pendingEmailChange}</strong>. Your profile
													will update after you confirm.
												</AlertDescription>
											</Alert>
										)}

										<div className="space-y-2">
											<Label htmlFor="email">Email Address</Label>
											<Input
												id="email"
												type="email"
												{...profileForm.register('email')}
												disabled={saving}
											/>
											{profileForm.formState.errors.email && (
												<p className="text-sm text-destructive">
													{profileForm.formState.errors.email.message}
												</p>
											)}
										</div>

										<div className="space-y-2">
											<Label htmlFor="phone">Phone Number</Label>
											<Input
												id="phone"
												type="tel"
												placeholder="(555) 123-4567"
												{...profileForm.register('phone')}
												disabled={saving}
											/>
											{profileForm.formState.errors.phone && (
												<p className="text-sm text-destructive">
													{profileForm.formState.errors.phone.message}
												</p>
											)}
										</div>
									</CardContent>
								</Card>

								{/* Action Buttons */}
								<div className="flex justify-end gap-3">
									<Button
										type="button"
										variant="outline"
										onClick={onClose}
										disabled={saving}>
										Cancel
									</Button>
									<Button type="submit" disabled={saving || !isProfileDirty}>
										{saving ? (
											<>
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												Saving...
											</>
										) : (
											'Save Changes'
										)}
									</Button>
								</div>
							</form>
						)}
					</TabsContent>

					<TabsContent value="security" className="space-y-6">
						{/* Change Password Section */}
						<Card>
							<CardHeader>
								<CardTitle>Change Password</CardTitle>
								<CardDescription>
									Update your password to keep your account secure
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form
									onSubmit={passwordForm.handleSubmit(handlePasswordChange)}
									className="space-y-4">
									{!isDemo() && (
										<div className="space-y-2">
											<Label htmlFor="currentPassword">Current Password</Label>
											<div className="relative">
												<Input
													id="currentPassword"
													type={showCurrentPassword ? 'text' : 'password'}
													{...passwordForm.register('currentPassword')}
													disabled={saving}
													className="pr-10"
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="absolute right-0 top-0 h-full px-3"
													onClick={() =>
														setShowCurrentPassword(!showCurrentPassword)
													}>
													{showCurrentPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
											</div>
											{passwordForm.formState.errors.currentPassword && (
												<p className="text-sm text-destructive">
													{
														passwordForm.formState.errors.currentPassword
															.message
													}
												</p>
											)}
										</div>
									)}

									<div className="space-y-2">
										<Label htmlFor="newPassword">New Password</Label>
										<div className="relative">
											<Input
												id="newPassword"
												type={showNewPassword ? 'text' : 'password'}
												{...passwordForm.register('newPassword')}
												disabled={saving}
												className="pr-10"
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="absolute right-0 top-0 h-full px-3"
												onClick={() => setShowNewPassword(!showNewPassword)}>
												{showNewPassword ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</Button>
										</div>
										{passwordForm.formState.errors.newPassword && (
											<p className="text-sm text-destructive">
												{passwordForm.formState.errors.newPassword.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="confirmPassword">
											Confirm New Password
										</Label>
										<Input
											id="confirmPassword"
											type="password"
											{...passwordForm.register('confirmPassword')}
											disabled={saving}
										/>
										{passwordForm.formState.errors.confirmPassword && (
											<p className="text-sm text-destructive">
												{passwordForm.formState.errors.confirmPassword.message}
											</p>
										)}
									</div>

									<Button
										type="submit"
										disabled={saving || !isPasswordDirty}
										className="w-full">
										{saving ? (
											<>
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												Updating Password...
											</>
										) : (
											'Update Password'
										)}
									</Button>
								</form>
							</CardContent>
						</Card>

						{/* Password Reset Section */}
						<Card>
							<CardHeader>
								<CardTitle>Password Reset</CardTitle>
								<CardDescription>
									Send yourself a password reset email
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Button
									variant="outline"
									onClick={handlePasswordReset}
									disabled={saving}
									className="w-full">
									{saving ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											Sending...
										</>
									) : (
										<>
											<Mail className="h-4 w-4 mr-2" />
											Send Reset Email
										</>
									)}
								</Button>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</DialogContent>

			{/* Square Cropper Modal */}
			<SquareCropperModal
				isOpen={showCropper}
				onClose={() => setShowCropper(false)}
				onSave={handleAvatarSave}
				title="Update Profile Photo"
				description="Select and crop a square photo for your profile."
				acceptedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
				maxFileSize={10 * 1024 * 1024} // 10MB
				outputSize={512}
			/>
		</Dialog>
	);
}
