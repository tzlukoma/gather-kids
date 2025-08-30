'use client';

import { useState, useMemo } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Users, UserCheck } from 'lucide-react';
import type { LeaderProfile } from '@/lib/types';

interface AddExistingLeaderDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	allLeaders: LeaderProfile[];
	existingLeaderIds: string[];
	onAddLeader: (leaderId: string, roleType: 'PRIMARY' | 'VOLUNTEER') => Promise<void>;
	ministryName: string;
}

export function AddExistingLeaderDialog({
	open,
	onOpenChange,
	allLeaders,
	existingLeaderIds,
	onAddLeader,
	ministryName,
}: AddExistingLeaderDialogProps) {
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedLeaderId, setSelectedLeaderId] = useState<string>('');
	const [selectedRole, setSelectedRole] = useState<'PRIMARY' | 'VOLUNTEER'>('VOLUNTEER');
	const [isAdding, setIsAdding] = useState(false);

	// Filter available leaders (exclude those already in the ministry)
	const availableLeaders = useMemo(() => {
		return allLeaders.filter(leader => 
			!existingLeaderIds.includes(leader.leader_id) &&
			leader.is_active
		);
	}, [allLeaders, existingLeaderIds]);

	// Filter by search term
	const filteredLeaders = useMemo(() => {
		if (!searchTerm.trim()) return availableLeaders;
		const lowerSearchTerm = searchTerm.toLowerCase();
		return availableLeaders.filter(leader =>
			`${leader.first_name} ${leader.last_name}`.toLowerCase().includes(lowerSearchTerm) ||
			leader.email?.toLowerCase().includes(lowerSearchTerm)
		);
	}, [availableLeaders, searchTerm]);

	const handleAdd = async () => {
		if (!selectedLeaderId) return;
		
		setIsAdding(true);
		try {
			await onAddLeader(selectedLeaderId, selectedRole);
			// Reset and close
			setSelectedLeaderId('');
			setSearchTerm('');
			setSelectedRole('VOLUNTEER');
			onOpenChange(false);
		} catch (error) {
			console.error('Failed to add leader:', error);
		} finally {
			setIsAdding(false);
		}
	};

	const handleCancel = () => {
		setSelectedLeaderId('');
		setSearchTerm('');
		setSelectedRole('VOLUNTEER');
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Add Existing Leader to {ministryName}
					</DialogTitle>
					<DialogDescription>
						Search and select an existing leader to add to this ministry.
					</DialogDescription>
				</DialogHeader>
				
				<div className="flex items-center gap-2 mb-4">
					<Search className="h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by name or email..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="flex-1"
					/>
				</div>

				<div className="flex-1 overflow-auto border rounded-md">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[50px]">Select</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredLeaders.map((leader) => (
								<TableRow
									key={leader.leader_id}
									className={selectedLeaderId === leader.leader_id ? 'bg-muted' : ''}
									onClick={() => setSelectedLeaderId(leader.leader_id)}
									style={{ cursor: 'pointer' }}>
									<TableCell>
										<input
											type="radio"
											checked={selectedLeaderId === leader.leader_id}
											onChange={() => setSelectedLeaderId(leader.leader_id)}
											className="h-4 w-4"
										/>
									</TableCell>
									<TableCell className="font-medium">
										{leader.first_name} {leader.last_name}
									</TableCell>
									<TableCell>{leader.email || '—'}</TableCell>
									<TableCell>{leader.phone || '—'}</TableCell>
									<TableCell>
										<Badge variant={leader.is_active ? 'default' : 'secondary'}>
											{leader.is_active ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
								</TableRow>
							))}
							{filteredLeaders.length === 0 && (
								<TableRow>
									<TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
										{availableLeaders.length === 0 ? 
											'No available leaders to add.' :
											'No leaders found matching your search.'}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{selectedLeaderId && (
					<div className="border-t pt-4">
						<Label className="text-base font-medium">Role Type</Label>
						<RadioGroup
							value={selectedRole}
							onValueChange={(value: 'PRIMARY' | 'VOLUNTEER') => setSelectedRole(value)}
							className="flex gap-6 mt-2">
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="PRIMARY" id="role-primary" />
								<Label htmlFor="role-primary">Primary Leader</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="VOLUNTEER" id="role-volunteer" />
								<Label htmlFor="role-volunteer">Volunteer</Label>
							</div>
						</RadioGroup>
					</div>
				)}

				<div className="flex justify-end gap-2 pt-4">
					<Button variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button 
						onClick={handleAdd} 
						disabled={!selectedLeaderId || isAdding}
						className="flex items-center gap-2">
						<UserCheck className="h-4 w-4" />
						{isAdding ? 'Adding...' : 'Add Leader'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}