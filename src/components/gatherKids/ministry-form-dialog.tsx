'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Ministry, MinistryGroup } from '@/lib/types';
import { saveMinistryAccount, getGroupsForMinistry } from '@/lib/dal';
import { useCreateMinistry, useUpdateMinistry } from '@/hooks/data/ministries';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { Separator } from '../ui/separator';
import { Badge } from '@/components/ui/badge';
import { dbAdapter } from '@/lib/db-utils';
import { Switch } from '../ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const customQuestionSchema = z.object({
	id: z.string(),
	text: z.string().min(1, 'Question text is required'),
	type: z.enum(['radio', 'checkbox', 'text']),
	options: z.array(z.string()).optional(),
});

const ministryFormSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters.'),
	code: z
		.string()
		.min(2, 'Code must be at least 2 characters.')
		.regex(
			/^[a-z0-9-]+$/,
			'Code can only contain lowercase letters, numbers, and hyphens.'
		),
	email: z
		.string()
		.email('Please enter a valid email address')
		.optional()
		.or(z.literal('')),
	enrollment_type: z.enum(['enrolled', 'expressed_interest']),
	is_active: z.boolean().default(true),
	open_at: z.string().optional(),
	close_at: z.string().optional(),
	description: z.string().optional(),
	details: z.string().optional(),
	custom_questions: z.array(customQuestionSchema).optional(),
});

type MinistryFormValues = z.infer<typeof ministryFormSchema>;

function parseDateField(value?: string) {
	if (!value) return undefined;
	const parsed = parseISO(value);
	return isValid(parsed) ? parsed : undefined;
}

function DatePickerField({
	value,
	onChange,
	id,
}: {
	value?: string;
	onChange: (value?: string) => void;
	id?: string;
}) {
	const selected = parseDateField(value);

	return (
		<Popover modal>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					className={cn(
						'w-full justify-start text-left font-normal',
						!selected && 'text-muted-foreground'
					)}>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{selected ? format(selected, 'PPP') : <span>Pick a date</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0 z-[60]" align="start">
				<Calendar
					mode="single"
					autoFocus
					selected={selected}
					onSelect={(date) =>
						onChange(date ? format(date, 'yyyy-MM-dd') : undefined)
					}
				/>
			</PopoverContent>
		</Popover>
	);
}

interface MinistryFormDialogProps {
	isOpen: boolean;
	onCloseAction: () => void;
	/** When provided with a ministry object, the dialog operates in edit mode.
	 *  Pass null to operate in create mode. */
	ministry: Ministry | null;
	/** Explicit mode discriminant. Defaults to 'edit' when ministry is non-null,
	 *  'create' when ministry is null. Supply this to make intent explicit (MAINT-07). */
	mode?: 'create' | 'edit';
	onMinistryUpdated?: () => void; // Callback to refresh the parent component
	createMinistryMutation?: ReturnType<typeof useCreateMinistry>;
	updateMinistryMutation?: ReturnType<typeof useUpdateMinistry>;
}

export function MinistryFormDialog({
	isOpen,
	onCloseAction,
	ministry,
	mode,
	onMinistryUpdated,
	createMinistryMutation,
	updateMinistryMutation,
}: MinistryFormDialogProps) {
	// Resolve mode: explicit prop takes precedence; fall back to presence of ministry object
	const resolvedMode: 'create' | 'edit' = mode ?? (ministry ? 'edit' : 'create');
	const isEditing = resolvedMode === 'edit';
	const { toast } = useToast();
	const [groupsForMinistry, setGroupsForMinistry] = useState<MinistryGroup[]>([]);
	const [isLoadingGroups, setIsLoadingGroups] = useState(false);

	// Always call hooks - use provided ones or create fallback ones
	const fallbackCreateMutation = useCreateMinistry();
	const fallbackUpdateMutation = useUpdateMinistry();
	const createMutation = createMinistryMutation || fallbackCreateMutation;
	const updateMutation = updateMinistryMutation || fallbackUpdateMutation;

	const form = useForm<MinistryFormValues>({
		resolver: zodResolver(ministryFormSchema),
		defaultValues: {
			name: '',
			code: '',
			email: '',
			enrollment_type: 'enrolled',
			is_active: true,
			open_at: undefined,
			close_at: undefined,
			description: '',
			details: '',
			custom_questions: [],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'custom_questions',
	});

	useEffect(() => {
		if (ministry) {
			form.reset({
				name: ministry.name,
				code: ministry.code,
				email: ministry.email || '', // Get email directly from ministry
				enrollment_type: ministry.enrollment_type,
				is_active: ministry.is_active ?? true,
				open_at: ministry.open_at || undefined,
				close_at: ministry.close_at || undefined,
				description: ministry.description,
				details: ministry.details,
				custom_questions:
					ministry.custom_questions?.map((q) => ({
						...q,
						options: q.options || [],
					})) || [],
			});

			// Load groups for this ministry
			setIsLoadingGroups(true);
			getGroupsForMinistry(ministry.ministry_id)
				.then((groups) => {
					setGroupsForMinistry(groups);
				})
				.catch((error) => {
					console.warn('Failed to load groups for ministry:', error);
					setGroupsForMinistry([]);
				})
				.finally(() => {
					setIsLoadingGroups(false);
				});
		} else {
			form.reset({
				name: '',
				code: '',
				email: '',
				enrollment_type: 'enrolled',
				is_active: true,
				open_at: undefined,
				close_at: undefined,
				description: '',
				details: '',
				custom_questions: [],
			});
			setGroupsForMinistry([]);
			setIsLoadingGroups(false);
		}
	}, [ministry, form, isOpen]);

	const onSubmit = async (data: MinistryFormValues) => {
		try {
			// Check for duplicate code using dbAdapter
			const allMinistries = await dbAdapter.listMinistries();
			const existingMinistry = allMinistries.find((m) => m.code === data.code);
			if (
				existingMinistry &&
				existingMinistry.ministry_id !== ministry?.ministry_id
			) {
				toast({
					title: 'Duplicate Code',
					description: `The code "${data.code}" is already in use by another ministry. Please choose a unique code.`,
					variant: 'destructive',
				});
				return;
			}

			const ministryData = data;

			function toDbMinistryPayload(md: Partial<MinistryFormValues>) {
				// Remove email from ministry payload since it goes to ministry_accounts table
				const { email, ...ministryData } = md;
				return {
					name: ministryData.name || '',
					code: ministryData.code || '',
					enrollment_type:
						(ministryData.enrollment_type as
							| 'enrolled'
							| 'expressed_interest') || 'enrolled',
					is_active: ministryData.is_active ?? true,
					open_at: ministryData.open_at ?? undefined,
					close_at: ministryData.close_at ?? undefined,
					description: ministryData.description ?? undefined,
					details: ministryData.details ?? undefined,
					custom_questions: ministryData.custom_questions ?? [],
				};
			}

			let ministryId: string;

			if (ministry) {
				await updateMutation.mutateAsync({ id: ministry.ministry_id, data: toDbMinistryPayload(data) });
				ministryId = ministry.ministry_id;

				toast({
					title: 'Ministry Updated',
					description: 'The ministry has been successfully updated.',
				});
			} else {
				ministryId = await createMutation.mutateAsync(toDbMinistryPayload(data));

				toast({
					title: 'Ministry Created',
					description: 'The new ministry has been created.',
				});
			}

			// Handle ministry account (email) separately
			if (data.email && data.email.trim() !== '') {
				try {
					console.log('🔍 MinistryFormDialog: Saving ministry account', {
						ministryId: ministryId,
						email: data.email.trim(),
						displayName: data.name,
						isUpdate: !!ministry,
					});

					await saveMinistryAccount({
						ministry_id: ministryId,
						email: data.email.trim(),
						display_name: data.name,
						is_active: true,
					});

					console.log(
						'✅ MinistryFormDialog: Ministry account saved successfully'
					);
				} catch (error) {
					console.error(
						'❌ MinistryFormDialog: Failed to save ministry account:',
						error
					);
					toast({
						title: 'Warning',
						description:
							'Ministry saved but email account could not be updated. You may need to set up the ministry account separately.',
						variant: 'destructive',
					});
				}
			} else if (ministry) {
				// If updating a ministry and email is empty, we might want to delete the ministry account
				// For now, just log this case
				console.log(
					'🔍 MinistryFormDialog: Email field is empty for existing ministry',
					{
						ministryId: ministryId,
						originalEmail: ministry.email,
					}
				);
			}

			// Notify parent component to refresh the ministries list
			if (onMinistryUpdated) {
				console.log('🔍 MinistryFormDialog: Triggering parent refresh');
				onMinistryUpdated();
			}

			onCloseAction();
		} catch (error) {
			console.error('Failed to save ministry', error);
			toast({
				title: 'Save Failed',
				description: 'Could not save the ministry. Please try again.',
				variant: 'destructive',
			});
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onCloseAction();
			}}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="font-headline">
						{isEditing ? 'Edit Ministry' : 'Add New Ministry'}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the details for this ministry or activity.'
							: 'Create a new program or interest-only activity.'}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6 py-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="code"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Code</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Ministry Email</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="ministry@example.com"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Email address for this ministry account (optional).
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
							<FormField
								control={form.control}
								name="enrollment_type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Type</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="enrolled">
													Ministry Program (Enrolled)
												</SelectItem>
												<SelectItem value="expressed_interest">
													Expressed Interest Activity
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="is_active"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>Active</FormLabel>
											<FormDescription>
												Inactive programs will not appear on the registration
												form.
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						</div>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea {...field} />
									</FormControl>
									<FormDescription>
										A short description shown on the registration form.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="details"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Information</FormLabel>
									<FormControl>
										<Textarea {...field} rows={5} />
									</FormControl>
									<FormDescription>
										Additional information or instructions displayed after a
										user selects this option.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="open_at"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Open Date</FormLabel>
										<DatePickerField
											id="open_at"
											value={field.value}
											onChange={field.onChange}
										/>
										<FormDescription>
											First day registrations are accepted (optional).
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="close_at"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Close Date</FormLabel>
										<DatePickerField
											id="close_at"
											value={field.value}
											onChange={field.onChange}
										/>
										<FormDescription>
											Last day registrations are accepted (optional).
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<Separator />

						{ministry && (
							<>
								<div className="space-y-3">
									<div>
										<h3 className="text-lg font-medium">Groups</h3>
										<p className="text-sm text-muted-foreground">
											Groups that this ministry belongs to
										</p>
									</div>
									{isLoadingGroups ? (
										<div className="text-sm text-muted-foreground">Loading groups...</div>
									) : groupsForMinistry.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{groupsForMinistry.map((group) => (
												<Badge 
													key={group.id} 
													variant="secondary"
													className="text-xs"
												>
													{group.name}
												</Badge>
											))}
										</div>
									) : (
										<div className="text-sm text-muted-foreground">Not assigned to any groups</div>
									)}
								</div>

								<Separator />
							</>
						)}

						<div>
							<h3 className="text-lg font-medium mb-2">Custom Questions</h3>
							{fields.map((field, index) => (
								<div
									key={field.id}
									className="p-4 border rounded-md mb-4 space-y-4 relative">
									<FormField
										control={form.control}
										name={`custom_questions.${index}.text`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Question Text</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name={`custom_questions.${index}.type`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Question Type</FormLabel>
												<Select
													onValueChange={field.onChange}
													defaultValue={field.value}>
													<FormControl>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														<SelectItem value="checkbox">Checkbox</SelectItem>
														<SelectItem value="radio">Radio Buttons</SelectItem>
														<SelectItem value="text">Text Input</SelectItem>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
									{['radio', 'checkbox'].includes(
										form.watch(`custom_questions.${index}.type`) ?? ''
									) && (
										<FormField
											control={form.control}
											name={`custom_questions.${index}.options`}
											render={({ field }) => (
												<FormItem>
													<FormLabel>Options (one per line)</FormLabel>
													<FormControl>
														<Textarea
															value={
																Array.isArray(field.value)
																	? field.value.join('\n')
																	: ''
															}
															onChange={(e) =>
																field.onChange(e.target.value.split('\n'))
															}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									)}
									<Button
										type="button"
										variant="destructive"
										size="icon"
										className="absolute top-2 right-2"
										onClick={() => remove(index)}>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									append({ id: uuidv4(), text: '', type: 'text', options: [] })
								}>
								<PlusCircle className="mr-2 h-4 w-4" /> Add Question
							</Button>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="ghost"
								onClick={() => onCloseAction()}>
								Cancel
							</Button>
							<Button type="submit">Save Changes</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
