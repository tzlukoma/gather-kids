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
import { useUpdateEmergencyContact } from '@/hooks/data';
import type { EmergencyContact } from '@/lib/types';

const emergencyContactSchema = z.object({
	first_name: z.string().min(1, 'First name is required.'),
	last_name: z.string().min(1, 'Last name is required.'),
	mobile_phone: z.string().min(10, 'A valid phone number is required.'),
	relationship: z.string().min(1, 'Relationship is required.'),
});

type EmergencyContactFormData = z.infer<typeof emergencyContactSchema>;

interface EditEmergencyContactModalProps {
	contact: EmergencyContact;
	householdId: string;
	onClose: () => void;
}

export function EditEmergencyContactModal({
	contact,
	householdId,
	onClose,
}: EditEmergencyContactModalProps) {
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);

	const updateEmergencyContactMutation = useUpdateEmergencyContact();

	const form = useForm<EmergencyContactFormData>({
		resolver: zodResolver(emergencyContactSchema),
		defaultValues: {
			first_name: contact.first_name,
			last_name: contact.last_name,
			mobile_phone: contact.mobile_phone,
			relationship: contact.relationship,
		},
	});

	const onSubmit = async (data: EmergencyContactFormData) => {
		setIsLoading(true);
		try {
			await updateEmergencyContactMutation.mutateAsync({
				householdId,
				contact: {
					contact_id: contact.contact_id,
					household_id: householdId,
					first_name: data.first_name,
					last_name: data.last_name,
					mobile_phone: data.mobile_phone,
					relationship: data.relationship,
				},
			});

			toast({
				title: 'Emergency Contact Updated',
				description: `${data.first_name} ${data.last_name} has been updated successfully.`,
			});

			onClose();
		} catch (error) {
			console.error('Failed to save emergency contact:', error);
			toast({
				title: 'Save Failed',
				description: 'Could not save the emergency contact. Please try again.',
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
					<DialogTitle>Edit Emergency Contact</DialogTitle>
					<DialogDescription>
						Update the emergency contact information below.
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
											<Input placeholder="Jane" {...field} />
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
											<Input placeholder="Smith" {...field} />
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
							name="relationship"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Relationship</FormLabel>
									<FormControl>
										<Input
											placeholder="Aunt, Uncle, Grandparent, etc."
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
								{isLoading ? 'Saving...' : 'Update'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
