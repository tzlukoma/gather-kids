'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks';
import { Loader2, Users } from 'lucide-react';
import type { MinistryGroup, Ministry } from '@/lib/types';
import { 
	getMinistries, 
	getMinistriesInGroup, 
	addMinistryToGroup, 
	removeMinistryFromGroup 
} from '@/lib/dal';

interface MinistryAssignmentDialogProps {
	isOpen: boolean;
	onCloseAction: () => void;
	group: MinistryGroup | null;
	onAssignmentUpdated: () => void;
}

export function MinistryAssignmentDialog({
	isOpen,
	onCloseAction,
	group,
	onAssignmentUpdated,
}: MinistryAssignmentDialogProps) {
	const { toast } = useToast();
	const [allMinistries, setAllMinistries] = useState<Ministry[]>([]);
	const [assignedMinistryIds, setAssignedMinistryIds] = useState<Set<string>>(new Set());
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (isOpen && group) {
			loadData();
		}
	}, [isOpen, group]);

	const loadData = async () => {
		if (!group) return;
		
		setIsLoading(true);
		try {
			console.log('🔍 MinistryAssignmentDialog: Loading ministries and assignments for group', group.id);
			
			const [ministries, assignedMinistries] = await Promise.all([
				getMinistries(),
				getMinistriesInGroup(group.id)
			]);
			
			setAllMinistries(ministries);
			setAssignedMinistryIds(new Set(assignedMinistries.map(m => m.ministry_id)));
			
			console.log('✅ MinistryAssignmentDialog: Data loaded', {
				totalMinistries: ministries.length,
				assignedMinistries: assignedMinistries.length
			});
		} catch (error) {
			console.error('❌ MinistryAssignmentDialog: Failed to load data', error);
			toast({
				title: 'Error',
				description: 'Failed to load ministry data. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleMinistryToggle = (ministryId: string, isChecked: boolean) => {
		setAssignedMinistryIds(prev => {
			const newSet = new Set(prev);
			if (isChecked) {
				newSet.add(ministryId);
			} else {
				newSet.delete(ministryId);
			}
			return newSet;
		});
	};

	const handleSave = async () => {
		if (!group) return;

		setIsSaving(true);
		try {
			console.log('🔍 MinistryAssignmentDialog: Saving ministry assignments for group', group.id);
			
			// Get current assignments from server
			const currentAssignments = await getMinistriesInGroup(group.id);
			const currentIds = new Set(currentAssignments.map(m => m.ministry_id));
			
			// Calculate changes
			const toAdd = Array.from(assignedMinistryIds).filter(id => !currentIds.has(id));
			const toRemove = Array.from(currentIds).filter(id => !assignedMinistryIds.has(id));
			
			console.log('🔄 MinistryAssignmentDialog: Processing changes', {
				toAdd: toAdd.length,
				toRemove: toRemove.length
			});

			// Apply additions
			for (const ministryId of toAdd) {
				await addMinistryToGroup(group.id, ministryId);
			}

			// Apply removals
			for (const ministryId of toRemove) {
				await removeMinistryFromGroup(group.id, ministryId);
			}

			console.log('✅ MinistryAssignmentDialog: Ministry assignments saved successfully');
			
			toast({
				title: 'Assignments Updated',
				description: `Successfully updated ministry assignments for ${group.name}.`,
			});
			
			onCloseAction();
			onAssignmentUpdated();
		} catch (error) {
			console.error('❌ MinistryAssignmentDialog: Failed to save assignments', error);
			toast({
				title: 'Error',
				description: 'Failed to save ministry assignments. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleClose = () => {
		setAssignedMinistryIds(new Set());
		onCloseAction();
	};

	if (!group) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="font-headline flex items-center gap-2">
						<Users className="h-5 w-5" />
						Assign Ministries to "{group.name}"
					</DialogTitle>
					<DialogDescription>
						Select which ministries should be part of this group. Group assignments enable 
						group-level permissions and digest notifications.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto py-4">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin mr-2" />
							<span>Loading ministries...</span>
						</div>
					) : (
						<div className="space-y-6">
							{/* Enrolled Programs */}
							<Card>
								<CardHeader>
									<CardTitle className="text-lg">Ministry Programs</CardTitle>
									<CardDescription>
										Programs children can be officially enrolled in
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid gap-3">
										{allMinistries
											.filter(m => m.enrollment_type === 'enrolled' && !m.code.startsWith('min_sunday'))
											.map((ministry) => (
												<div key={ministry.ministry_id} className="flex items-center space-x-3 p-2 rounded border">
													<Checkbox
														id={`ministry-${ministry.ministry_id}`}
														checked={assignedMinistryIds.has(ministry.ministry_id)}
														onCheckedChange={(checked) => 
															handleMinistryToggle(ministry.ministry_id, checked === true)
														}
													/>
													<div className="flex-1">
														<label 
															htmlFor={`ministry-${ministry.ministry_id}`}
															className="text-sm font-medium cursor-pointer"
														>
															{ministry.name}
														</label>
														<div className="flex items-center gap-2 mt-1">
															<Badge variant="outline" className="text-xs">
																{ministry.code}
															</Badge>
															{ministry.min_age || ministry.max_age ? (
																<span className="text-xs text-muted-foreground">
																	Ages {ministry.min_age ?? '?'} - {ministry.max_age ?? '?'}
																</span>
															) : (
																<span className="text-xs text-muted-foreground">All ages</span>
															)}
														</div>
													</div>
												</div>
											))}
									</div>
								</CardContent>
							</Card>

							{/* Interest Programs */}
							<Card>
								<CardHeader>
									<CardTitle className="text-lg">Expressed Interest Activities</CardTitle>
									<CardDescription>
										Activities to gauge interest without official enrollment
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid gap-3">
										{allMinistries
											.filter(m => m.enrollment_type === 'expressed_interest')
											.map((ministry) => (
												<div key={ministry.ministry_id} className="flex items-center space-x-3 p-2 rounded border">
													<Checkbox
														id={`ministry-${ministry.ministry_id}`}
														checked={assignedMinistryIds.has(ministry.ministry_id)}
														onCheckedChange={(checked) => 
															handleMinistryToggle(ministry.ministry_id, checked === true)
														}
													/>
													<div className="flex-1">
														<label 
															htmlFor={`ministry-${ministry.ministry_id}`}
															className="text-sm font-medium cursor-pointer"
														>
															{ministry.name}
														</label>
														<div className="flex items-center gap-2 mt-1">
															<Badge variant="outline" className="text-xs">
																{ministry.code}
															</Badge>
															{ministry.min_age || ministry.max_age ? (
																<span className="text-xs text-muted-foreground">
																	Ages {ministry.min_age ?? '?'} - {ministry.max_age ?? '?'}
																</span>
															) : (
																<span className="text-xs text-muted-foreground">All ages</span>
															)}
														</div>
													</div>
												</div>
											))}
									</div>
								</CardContent>
							</Card>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={isLoading || isSaving}>
						{isSaving ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
								Saving...
							</>
						) : (
							'Save Assignments'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}