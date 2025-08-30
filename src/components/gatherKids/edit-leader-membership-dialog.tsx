'use client';

import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Edit2, Trash2 } from 'lucide-react';
import type { LeaderProfile, MinistryLeaderMembership } from '@/lib/types';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EditLeaderMembershipDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	membership: (MinistryLeaderMembership & { profile: LeaderProfile }) | null;
	ministryName: string;
	onUpdateMembership: (
		membershipId: string,
		updates: { role_type?: 'PRIMARY' | 'VOLUNTEER'; is_active?: boolean; notes?: string }
	) => Promise<void>;
	onRemoveMembership: (membershipId: string) => Promise<void>;
}

export function EditLeaderMembershipDialog({
	open,
	onOpenChange,
	membership,
	ministryName,
	onUpdateMembership,
	onRemoveMembership,
}: EditLeaderMembershipDialogProps) {
	const [roleType, setRoleType] = useState<'PRIMARY' | 'VOLUNTEER'>('VOLUNTEER');
	const [isActive, setIsActive] = useState(true);
	const [notes, setNotes] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [showRemoveDialog, setShowRemoveDialog] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);

	// Initialize form when membership changes
	useEffect(() => {
		if (membership) {
			setRoleType(membership.role_type);
			setIsActive(membership.is_active);
			setNotes(membership.notes || '');
		}
	}, [membership]);

	const hasChanges = membership && (
		roleType !== membership.role_type ||
		isActive !== membership.is_active ||
		notes !== (membership.notes || '')
	);

	const handleSave = async () => {
		if (!membership || !hasChanges) return;

		setIsSaving(true);
		try {
			const updates: { role_type?: 'PRIMARY' | 'VOLUNTEER'; is_active?: boolean; notes?: string } = {};

			if (roleType !== membership.role_type) {
				updates.role_type = roleType;
			}
			if (isActive !== membership.is_active) {
				updates.is_active = isActive;
			}
			if (notes !== (membership.notes || '')) {
				updates.notes = notes || undefined;
			}

			await onUpdateMembership(membership.membership_id, updates);
			onOpenChange(false);
		} catch (error) {
			console.error('Failed to update membership:', error);
		} finally {
			setIsSaving(false);
		}
	};

	const handleRemove = async () => {
		if (!membership) return;

		setIsRemoving(true);
		try {
			await onRemoveMembership(membership.membership_id);
			setShowRemoveDialog(false);
			onOpenChange(false);
		} catch (error) {
			console.error('Failed to remove membership:', error);
		} finally {
			setIsRemoving(false);
		}
	};

	const handleCancel = () => {
		if (membership) {
			setRoleType(membership.role_type);
			setIsActive(membership.is_active);
			setNotes(membership.notes || '');
		}
		onOpenChange(false);
	};

	if (!membership) return null;

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Edit2 className="h-5 w-5" />
							Edit {membership.profile.first_name} {membership.profile.last_name} - {ministryName}
						</DialogTitle>
						<DialogDescription>
							Modify the role type, active status, and notes for this leader&apos;s membership.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						<div className="space-y-3">
							<Label className="text-base font-medium">Role Type</Label>
							<RadioGroup
								value={roleType}
								onValueChange={(value: 'PRIMARY' | 'VOLUNTEER') => setRoleType(value)}
								className="flex gap-6">
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="PRIMARY" id="edit-role-primary" />
									<Label htmlFor="edit-role-primary">Primary Leader</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="VOLUNTEER" id="edit-role-volunteer" />
									<Label htmlFor="edit-role-volunteer">Volunteer</Label>
								</div>
							</RadioGroup>
						</div>

						<div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
							<div className="space-y-0.5">
								<Label htmlFor="membership-active" className="font-medium">
									Active Membership
								</Label>
								<p className="text-xs text-muted-foreground">
									{isActive ? 'This membership is active' : 'This membership is inactive'}
								</p>
							</div>
							<Switch
								id="membership-active"
								checked={isActive}
								onCheckedChange={setIsActive}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="membership-notes">Notes</Label>
							<Textarea
								id="membership-notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Optional notes about this membership..."
								rows={3}
							/>
						</div>
					</div>

					<div className="flex justify-between pt-4">
						<Button 
							variant="destructive" 
							onClick={() => setShowRemoveDialog(true)}
							className="flex items-center gap-2">
							<Trash2 className="h-4 w-4" />
							Remove from Ministry
						</Button>
						
						<div className="flex gap-2">
							<Button variant="outline" onClick={handleCancel}>
								Cancel
							</Button>
							<Button 
								onClick={handleSave} 
								disabled={!hasChanges || isSaving}
								className="flex items-center gap-2">
								<Edit2 className="h-4 w-4" />
								{isSaving ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Leader from Ministry</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove {membership.profile.first_name} {membership.profile.last_name} from {ministryName}? 
							This action cannot be undone, but you can re-add them later if needed.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction 
							onClick={handleRemove}
							disabled={isRemoving}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							{isRemoving ? 'Removing...' : 'Remove Leader'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}