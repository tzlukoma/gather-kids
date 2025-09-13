'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { MinistryGroup } from '@/lib/types';
import { createMinistryGroup, updateMinistryGroup } from '@/lib/dal';
import { useEffect } from 'react';

const ministryGroupFormSchema = z.object({
	code: z.string().min(1, 'Code is required').regex(/^[a-z0-9_-]+$/, 'Code must contain only lowercase letters, numbers, underscores, and hyphens'),
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
});

type FormData = z.infer<typeof ministryGroupFormSchema>;

interface MinistryGroupFormDialogProps {
	isOpen: boolean;
	onCloseAction: () => void;
	group?: MinistryGroup | null;
	onGroupUpdated: () => void;
}

export function MinistryGroupFormDialog({
	isOpen,
	onCloseAction,
	group,
	onGroupUpdated,
}: MinistryGroupFormDialogProps) {
	const { toast } = useToast();
	const isEditing = Boolean(group);

	const form = useForm<FormData>({
		resolver: zodResolver(ministryGroupFormSchema),
		defaultValues: {
			code: '',
			name: '',
			description: '',
		},
	});

	// Reset form when dialog opens/closes or group changes
	useEffect(() => {
		if (isOpen && group) {
			form.reset({
				code: group.code,
				name: group.name,
				description: group.description || '',
			});
		} else if (isOpen && !group) {
			form.reset({
				code: '',
				name: '',
				description: '',
			});
		}
	}, [isOpen, group, form]);

	const onSubmit = async (data: FormData) => {
		try {
			console.log('🔍 MinistryGroupFormDialog: Submitting form data', data);

			if (isEditing && group) {
				console.log('🔄 MinistryGroupFormDialog: Updating existing group', group.id);
				await updateMinistryGroup(group.id, data);
				toast({
					title: 'Group Updated',
					description: `Successfully updated the "${data.name}" group.`,
				});
			} else {
				console.log('➕ MinistryGroupFormDialog: Creating new group');
				await createMinistryGroup(data);
				toast({
					title: 'Group Created',
					description: `Successfully created the "${data.name}" group.`,
				});
			}

			console.log('✅ MinistryGroupFormDialog: Operation completed successfully');
			onCloseAction();
			onGroupUpdated();
		} catch (error) {
			console.error('❌ MinistryGroupFormDialog: Error during form submission', error);
			toast({
				title: 'Error',
				description: isEditing
					? 'Failed to update the group. Please try again.'
					: 'Failed to create the group. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const handleClose = () => {
		form.reset();
		onCloseAction();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="font-headline">
						{isEditing ? 'Edit Ministry Group' : 'Create New Ministry Group'}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the ministry group information below.'
							: 'Create a new group to organize related ministries together.'}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="code"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Code*</FormLabel>
									<FormControl>
										<Input 
											placeholder="e.g. choirs, youth-ministry" 
											{...field} 
											disabled={isEditing} // Don't allow changing code on edit
										/>
									</FormControl>
									<FormDescription>
										Unique identifier for this group. Use lowercase letters, numbers, underscores, and hyphens only.
										{isEditing && " (Cannot be changed after creation)"}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name*</FormLabel>
									<FormControl>
										<Input placeholder="e.g. Choirs, Youth Ministry" {...field} />
									</FormControl>
									<FormDescription>
										Display name for this group that will be shown in the UI.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Optional description of this group..."
											rows={3}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Optional description to help identify the purpose of this group.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={handleClose}>
								Cancel
							</Button>
							<Button type="submit" disabled={form.formState.isSubmitting}>
								{form.formState.isSubmitting
									? 'Saving...'
									: isEditing
									? 'Update Group'
									: 'Create Group'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}