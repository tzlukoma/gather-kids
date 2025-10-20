'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAddGuardian, useUpdateGuardian } from '@/hooks/data';
import type { Guardian } from '@/lib/types';

const guardianSchema = z.object({
	first_name: z.string().min(1, 'First name is required.'),
	last_name: z.string().min(1, 'Last name is required.'),
	mobile_phone: z.string().min(10, 'A valid phone number is required.'),
	email: z
		.string()
		.email('A valid email is required.')
		.optional()
		.or(z.literal('')),
	relationship: z.string().min(1, 'Relationship is required.'),
	is_primary: z.boolean().default(false),
});

type GuardianFormData = z.infer<typeof guardianSchema>;

interface EditGuardianModalProps {
	guardian: Guardian | null; // null for adding new
	householdId: string;
	onClose: () => void;
}

export function EditGuardianModal({
	guardian,
	householdId,
	onClose,
}: EditGuardianModalProps) {
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);
	const isEditing = guardian !== null;

	const addGuardianMutation = useAddGuardian();
	const updateGuardianMutation = useUpdateGuardian();

	const form = useForm<GuardianFormData>({
		resolver: zodResolver(guardianSchema),
		defaultValues: guardian
			? {
					first_name: guardian.first_name,
					last_name: guardian.last_name,
					mobile_phone: guardian.mobile_phone,
					email: guardian.email || '',
					relationship: guardian.relationship,
					is_primary: guardian.is_primary,
			  }
			: {
					first_name: '',
					last_name: '',
					mobile_phone: '',
					email: '',
					relationship: 'Mother',
					is_primary: false,
			  },
	});

	const onSubmit = async (data: GuardianFormData) => {
		setIsLoading(true);
		try {
			if (isEditing && guardian) {
				await updateGuardianMutation.mutateAsync({
					guardianId: guardian.guardian_id,
					householdId,
					data: {
						first_name: data.first_name,
						last_name: data.last_name,
						mobile_phone: data.mobile_phone,
						email: data.email || undefined,
						relationship: data.relationship,
						is_primary: data.is_primary,
					},
				});

				toast({
					title: 'Guardian Updated',
					description: `${data.first_name} ${data.last_name} has been updated successfully.`,
				});
			} else {
				await addGuardianMutation.mutateAsync({
					householdId,
					guardian: {
						first_name: data.first_name,
						last_name: data.last_name,
						mobile_phone: data.mobile_phone,
						email: data.email || undefined,
						relationship: data.relationship,
						is_primary: data.is_primary,
					},
				});

				toast({
					title: 'Guardian Added',
					description: `${data.first_name} ${data.last_name} has been added successfully.`,
				});
			}

			onClose();
		} catch (error) {
			console.error('Failed to save guardian:', error);
			toast({
				title: 'Save Failed',
				description: 'Could not save the guardian. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={true} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? 'Edit Guardian' : 'Add Guardian'}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? 'Update the guardian information below.'
							: 'Add a new guardian to this household.'}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="first_name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>First Name</FormLabel>
										<FormControl>
											<Input placeholder="John" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="last_name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Last Name</FormLabel>
										<FormControl>
											<Input placeholder="Doe" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="mobile_phone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Phone Number</FormLabel>
									<FormControl>
										<PhoneInput {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email (Optional)</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="john@example.com"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="relationship"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Relationship</FormLabel>
									<FormControl>
										<Input
											placeholder="Mother, Father, Grandparent, etc."
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={onClose}>
								Cancel
							</Button>
							<Button type="submit" disabled={isLoading}>
								{isLoading ? 'Saving...' : isEditing ? 'Update' : 'Add'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
