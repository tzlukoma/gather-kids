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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { MinistryGroup } from '@/lib/types';
import { useCreateMinistryGroup, useUpdateMinistryGroup, useMinistriesInGroup } from '@/hooks/data/ministries';
import { useMemo } from 'react';

const ministryGroupFormSchema = z.object({
	code: z
		.string()
		.min(1, 'Code is required')
		.regex(
			/^[a-z0-9_-]+$/,
			'Code must contain only lowercase letters, numbers, underscores, and hyphens'
		),
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
	email: z.string().email('Invalid email format').optional().or(z.literal('')),
	custom_consent_text: z.string().optional(),
	custom_consent_required: z.boolean().default(false),
});

type FormInput = z.input<typeof ministryGroupFormSchema>;
type FormOutput = z.output<typeof ministryGroupFormSchema>;

const EMPTY_GROUP_FORM: FormInput = {
	code: '',
	name: '',
	description: '',
	email: '',
	custom_consent_text: '',
	custom_consent_required: false,
};

function groupToFormValues(group?: MinistryGroup | null): FormInput {
	if (!group) return EMPTY_GROUP_FORM;
	return {
		code: group.code,
		name: group.name,
		description: group.description || '',
		email: group.email || '',
		custom_consent_text: group.custom_consent_text || '',
		custom_consent_required: group.custom_consent_required || false,
	};
}

interface MinistryGroupFormDialogProps {
	isOpen: boolean;
	onCloseAction: () => void;
	group?: MinistryGroup | null;
	onGroupUpdated: () => void;
	createMinistryGroupMutation?: ReturnType<typeof useCreateMinistryGroup>;
	updateMinistryGroupMutation?: ReturnType<typeof useUpdateMinistryGroup>;
}

export function MinistryGroupFormDialog({
	isOpen,
	onCloseAction,
	group,
	onGroupUpdated,
	createMinistryGroupMutation,
	updateMinistryGroupMutation,
}: MinistryGroupFormDialogProps) {
	const { toast } = useToast();
	const isEditing = Boolean(group);
	const { data: ministriesInGroup = [], isLoading: isLoadingMinistries } =
		useMinistriesInGroup(isOpen && group ? group.id : '');

	// Always call hooks - use provided ones or create fallback ones
	const fallbackCreateMutation = useCreateMinistryGroup();
	const fallbackUpdateMutation = useUpdateMinistryGroup();
	const createMutation = createMinistryGroupMutation || fallbackCreateMutation;
	const updateMutation = updateMinistryGroupMutation || fallbackUpdateMutation;

	const formValues = useMemo(() => groupToFormValues(isOpen ? group : null), [isOpen, group]);
	const form = useForm<FormInput, unknown, FormOutput>({
		resolver: zodResolver(ministryGroupFormSchema),
		values: formValues,
	});

	const onSubmit = async (data: FormOutput) => {
		try {
			console.log('🔍 MinistryGroupFormDialog: Submitting form data', data);

			if (isEditing && group) {
				console.log(
					'🔄 MinistryGroupFormDialog: Updating existing group',
					group.id
				);
				await updateMutation.mutateAsync({ id: group.id, data });
				toast({
					title: 'Group Updated',
					description: `Successfully updated the "${data.name}" group.`,
				});
			} else {
				console.log('➕ MinistryGroupFormDialog: Creating new group');
				await createMutation.mutateAsync(data);
				toast({
					title: 'Group Created',
					description: `Successfully created the "${data.name}" group.`,
				});
			}

			console.log(
				'✅ MinistryGroupFormDialog: Operation completed successfully'
			);
			onCloseAction();
			onGroupUpdated();
		} catch (error) {
			console.error(
				'❌ MinistryGroupFormDialog: Error during form submission',
				error
			);
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
		onCloseAction();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
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
										Unique identifier for this group. Use lowercase letters,
										numbers, underscores, and hyphens only.
										{isEditing && ' (Cannot be changed after creation)'}
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
										<Input
											placeholder="e.g. Choirs, Youth Ministry"
											{...field}
										/>
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
										Optional description to help identify the purpose of this
										group.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Contact Email</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g. choirs@example.com"
											type="email"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Optional email address that will receive digest
										notifications for all ministries in this group.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Separator />

						<div className="space-y-4">
							<div>
								<h4 className="text-sm font-medium">
									Custom Consent Management
								</h4>
								<p className="text-xs text-muted-foreground">
									Define custom consent text and requirements for this group
								</p>
							</div>

							<FormField
								control={form.control}
								name="custom_consent_required"
								render={({ field }) => (
									<FormItem className="flex flex-row items-start space-x-3 space-y-0">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<div className="space-y-1 leading-none">
											<FormLabel>
												Require custom consent for this group
											</FormLabel>
											<FormDescription>
												When enabled, families will be asked to provide consent
												when registering for ministries in this group.
											</FormDescription>
										</div>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="custom_consent_text"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Custom Consent Text</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Enter the consent text that will be displayed to families during registration..."
												rows={4}
												{...field}
											/>
										</FormControl>
										<FormDescription>
											This text will be displayed in the registration form when
											families register for ministries in this group.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{isEditing && (
							<>
								<Separator />
								<div className="space-y-3">
									<div>
										<h4 className="text-sm font-medium">
											Ministries in this Group
										</h4>
										<p className="text-xs text-muted-foreground">
											These ministries are currently assigned to this group
										</p>
									</div>
									{isLoadingMinistries ? (
										<div className="text-sm text-muted-foreground">
											Loading ministries...
										</div>
									) : ministriesInGroup.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{ministriesInGroup.map((ministry) => (
												<Badge
													key={ministry.ministry_id}
													variant="secondary"
													className="text-xs">
													{ministry.name}
												</Badge>
											))}
										</div>
									) : (
										<div className="text-sm text-muted-foreground">
											No ministries assigned to this group
										</div>
									)}
								</div>
							</>
						)}

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
