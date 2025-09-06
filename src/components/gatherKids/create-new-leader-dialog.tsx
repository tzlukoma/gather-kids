'use client';

import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { UserPlus } from 'lucide-react';
import type { LeaderProfile } from '@/lib/types';

interface CreateNewLeaderDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateLeader: (
		profileData: Omit<LeaderProfile, 'leader_id' | 'created_at' | 'updated_at'>,
		roleType: 'PRIMARY' | 'VOLUNTEER'
	) => Promise<void>;
	ministryName: string;
}

export function CreateNewLeaderDialog({
	open,
	onOpenChange,
	onCreateLeader,
	ministryName,
}: CreateNewLeaderDialogProps) {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [notes, setNotes] = useState('');
	const [isActive, setIsActive] = useState(true);
	const [selectedRole, setSelectedRole] = useState<'PRIMARY' | 'VOLUNTEER'>('VOLUNTEER');
	const [isCreating, setIsCreating] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const validateForm = () => {
		const newErrors: Record<string, string> = {};

		if (!firstName.trim()) {
			newErrors.firstName = 'First name is required';
		}

		if (!lastName.trim()) {
			newErrors.lastName = 'Last name is required';
		}

		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			newErrors.email = 'Please enter a valid email address';
		}

		if (phone && !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
			newErrors.phone = 'Please enter a valid 10-digit phone number';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleCreate = async () => {
		if (!validateForm()) return;

		setIsCreating(true);
		try {
			const profileData: Omit<LeaderProfile, 'leader_id' | 'created_at' | 'updated_at'> = {
				first_name: firstName.trim(),
				last_name: lastName.trim(),
				email: email.trim() || undefined,
				phone: phone.replace(/\D/g, '') || undefined,
				notes: notes.trim() || undefined,
				is_active: isActive,
			};

			await onCreateLeader(profileData, selectedRole);

			// Reset form
			setFirstName('');
			setLastName('');
			setEmail('');
			setPhone('');
			setNotes('');
			setIsActive(true);
			setSelectedRole('VOLUNTEER');
			setErrors({});
			onOpenChange(false);
		} catch (error) {
			console.error('Failed to create leader:', error);
		} finally {
			setIsCreating(false);
		}
	};

	const handleCancel = () => {
		setFirstName('');
		setLastName('');
		setEmail('');
		setPhone('');
		setNotes('');
		setIsActive(true);
		setSelectedRole('VOLUNTEER');
		setErrors({});
		onOpenChange(false);
	};

	const formatPhoneNumber = (value: string) => {
		const digits = value.replace(/\D/g, '');
		if (digits.length <= 3) return digits;
		if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UserPlus className="h-5 w-5" />
						Create New Leader for {ministryName}
					</DialogTitle>
					<DialogDescription>
						Create a new leader profile and assign them to this ministry.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="firstName">
								First Name <span className="text-red-500">*</span>
							</Label>
							<Input
								id="firstName"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								placeholder="Enter first name"
								className={errors.firstName ? 'border-red-500' : ''}
							/>
							{errors.firstName && (
								<p className="text-sm text-red-500">{errors.firstName}</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="lastName">
								Last Name <span className="text-red-500">*</span>
							</Label>
							<Input
								id="lastName"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								placeholder="Enter last name"
								className={errors.lastName ? 'border-red-500' : ''}
							/>
							{errors.lastName && (
								<p className="text-sm text-red-500">{errors.lastName}</p>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Enter email address"
							className={errors.email ? 'border-red-500' : ''}
						/>
						{errors.email && (
							<p className="text-sm text-red-500">{errors.email}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="phone">Phone</Label>
						<Input
							id="phone"
							value={formatPhoneNumber(phone)}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="(555) 123-4567"
							className={errors.phone ? 'border-red-500' : ''}
						/>
						{errors.phone && (
							<p className="text-sm text-red-500">{errors.phone}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="notes">Notes</Label>
						<Textarea
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Optional notes about this leader..."
							rows={3}
						/>
					</div>

					<div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
						<div className="space-y-0.5">
							<Label htmlFor="leader-active" className="font-medium">
								Active Leader
							</Label>
							<p className="text-xs text-muted-foreground">
								{isActive ? 'This leader is active' : 'This leader is inactive'}
							</p>
						</div>
						<Switch
							id="leader-active"
							checked={isActive}
							onCheckedChange={setIsActive}
						/>
					</div>

					<div className="space-y-3">
						<Label className="text-base font-medium">Role Type</Label>
						<RadioGroup
							value={selectedRole}
							onValueChange={(value: 'PRIMARY' | 'VOLUNTEER') => setSelectedRole(value)}
							className="flex gap-6">
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="PRIMARY" id="new-role-primary" />
								<Label htmlFor="new-role-primary">Primary Leader</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="VOLUNTEER" id="new-role-volunteer" />
								<Label htmlFor="new-role-volunteer">Volunteer</Label>
							</div>
						</RadioGroup>
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-4">
					<Button variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button 
						onClick={handleCreate} 
						disabled={isCreating}
						className="flex items-center gap-2">
						<UserPlus className="h-4 w-4" />
						{isCreating ? 'Creating...' : 'Create Leader'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}