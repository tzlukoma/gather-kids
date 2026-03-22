'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { saveLeaderProfile } from '@/lib/dal';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { LeaderProfile } from '@/lib/types';

const leaderProfileSchema = z.object({
	first_name: z.string().min(1, 'First name is required'),
	last_name: z.string().min(1, 'Last name is required'),
	email: z.string().email('Invalid email format').optional().or(z.literal('')),
	phone: z.string().optional(),
	notes: z.string().optional(),
	is_active: z.boolean(),
});

type LeaderProfileFormData = z.infer<typeof leaderProfileSchema>;

interface LeaderProfileDialogProps {
	leader?: LeaderProfile | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSaved?: (leader: LeaderProfile) => void;
}

export function LeaderProfileDialog({ 
	leader, 
	open, 
	onOpenChange,
	onSaved 
}: LeaderProfileDialogProps) {
	const [isSaving, setIsSaving] = useState(false);
	const { toast } = useToast();

	const form = useForm<LeaderProfileFormData>({
		resolver: zodResolver(leaderProfileSchema),
		defaultValues: {
			first_name: '',
			last_name: '',
			email: '',
			phone: '',
			notes: '',
			is_active: true,
		},
	});

	// Reset form when dialog opens/closes or leader changes
	useEffect(() => {
		if (open) {
			if (leader) {
				// Editing existing leader
				form.reset({
					first_name: leader.first_name,
					last_name: leader.last_name,
					email: leader.email || '',
					phone: leader.phone || '',
					notes: leader.notes || '',
					is_active: leader.is_active,
				});
			} else {
				// Creating new leader
				form.reset({
					first_name: '',
					last_name: '',
					email: '',
					phone: '',
					notes: '',
					is_active: true,
				});
			}
		}
	}, [open, leader, form]);

	const onSubmit = async (data: LeaderProfileFormData) => {
		setIsSaving(true);
		try {
			const profileData: Omit<LeaderProfile, 'created_at' | 'updated_at'> & { created_at?: string } = {
				leader_id: leader?.leader_id || uuidv4(),
				first_name: data.first_name,
				last_name: data.last_name,
				email: data.email || undefined,
				phone: data.phone || undefined,
				notes: data.notes || undefined,
				is_active: data.is_active,
			};

			// Keep existing created_at if editing
			if (leader) {
				profileData.created_at = leader.created_at;
			}

			await saveLeaderProfile(profileData);

			toast({
				title: leader ? 'Profile Updated' : 'Profile Created',
				description: `Leader profile for ${data.first_name} ${data.last_name} has been ${leader ? 'updated' : 'created'}.`,
			});

			if (onSaved) {
				onSaved(profileData as LeaderProfile);
			}

			onOpenChange(false);
		} catch (error) {
			console.error('Failed to save leader profile:', error);
			toast({
				title: 'Save Failed',
				description: error instanceof Error ? error.message : 'Could not save the leader profile.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{leader ? 'Edit Leader Profile' : 'Create New Leader Profile'}
					</DialogTitle>
					<DialogDescription>
						{leader 
							? 'Update the leader\'s profile information. Ministry memberships are managed separately.'
							: 'Create a new leader profile. You can assign them to ministries after creation.'
						}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="first_name">First Name *</Label>
							<Input
								id="first_name"
								{...form.register('first_name')}
								disabled={isSaving}
							/>
							{form.formState.errors.first_name && (
								<p className="text-sm text-destructive">
									{form.formState.errors.first_name.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="last_name">Last Name *</Label>
							<Input
								id="last_name"
								{...form.register('last_name')}
								disabled={isSaving}
							/>
							{form.formState.errors.last_name && (
								<p className="text-sm text-destructive">
									{form.formState.errors.last_name.message}
								</p>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							{...form.register('email')}
							disabled={isSaving}
							placeholder="leader@example.com"
						/>
						{form.formState.errors.email && (
							<p className="text-sm text-destructive">
								{form.formState.errors.email.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="phone">Phone</Label>
						<Input
							id="phone"
							{...form.register('phone')}
							disabled={isSaving}
							placeholder="(555) 123-4567"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="notes">Notes</Label>
						<Textarea
							id="notes"
							{...form.register('notes')}
							disabled={isSaving}
							placeholder="Any additional notes about this leader..."
							rows={3}
						/>
					</div>

					<div className="flex items-center space-x-2">
						<Switch
							id="is_active"
							checked={form.watch('is_active')}
							onCheckedChange={(checked) => form.setValue('is_active', checked)}
							disabled={isSaving}
						/>
						<Label htmlFor="is_active">Active Leader</Label>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSaving}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSaving}>
							{isSaving ? 'Saving...' : (leader ? 'Update Profile' : 'Create Profile')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}