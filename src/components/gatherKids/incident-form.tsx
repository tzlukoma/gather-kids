'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getTodayIsoDate, logIncident } from '@/lib/dal';
import type { IncidentSeverity } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';

const incidentFormSchema = z.object({
	childId: z.string({ required_error: 'Please select a child.' }),
	severity: z.enum(['low', 'medium', 'high'], {
		required_error: 'You need to select a severity level.',
	}),
	description: z
		.string()
		.min(10, { message: 'Description must be at least 10 characters.' })
		.max(500, {
			message: 'Description must not be longer than 500 characters.',
		}),
});

type IncidentFormValues = z.infer<typeof incidentFormSchema>;

const defaultValues: Partial<IncidentFormValues> = {
	description: '',
};

export function IncidentForm() {
	const { toast } = useToast();
	const { user } = useAuth();
	const form = useForm<IncidentFormValues>({
		resolver: zodResolver(incidentFormSchema),
		defaultValues,
		mode: 'onChange',
	});

	const today = getTodayIsoDate();
	const checkedInChildren = useLiveQuery(async () => {
		const attendance = await db.attendance.where({ date: today }).toArray();
		if (!attendance.length) return [];

		let childIds = attendance.map((a) => a.child_id);

		if (
			user?.metadata?.role === AuthRole.MINISTRY_LEADER &&
			user.assignedMinistryIds
		) {
			const enrollments = await db.ministry_enrollments
				.where('ministry_id')
				.anyOf(user.assignedMinistryIds)
				.and((e) => e.cycle_id === '2025' && childIds.includes(e.child_id))
				.toArray();
			childIds = [...new Set(enrollments.map((e) => e.child_id))];
		}

		if (childIds.length === 0) return [];
		return db.children.where('child_id').anyOf(childIds).toArray();
	}, [today, user]);

	async function onSubmit(data: IncidentFormValues) {
		try {
			const child = checkedInChildren?.find((c) => c.child_id === data.childId);
			if (!child) throw new Error('Child not found');

			await logIncident({
				child_id: data.childId,
				child_name: `${child.first_name} ${child.last_name}`,
				description: data.description,
				severity: data.severity as IncidentSeverity,
				leader_id: user?.id || 'unknown_user',
			});

			toast({
				title: 'Incident Logged',
				description: `An incident for ${child.first_name} has been logged.`,
			});
			form.reset();
		} catch (e) {
			console.error(e);
			toast({
				title: 'Error',
				description: 'Failed to log the incident.',
				variant: 'destructive',
			});
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
				<FormField
					control={form.control}
					name="childId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Child Involved</FormLabel>
							<Select onValueChange={field.onChange} defaultValue={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select a checked-in child" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{checkedInChildren?.map((child) => (
										<SelectItem key={child.child_id} value={child.child_id}>
											{child.first_name} {child.last_name}
										</SelectItem>
									))}
									{(!checkedInChildren || checkedInChildren.length === 0) && (
										<div className="p-4 text-center text-sm text-muted-foreground">
											No checked-in children found for your assigned ministries.
										</div>
									)}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="severity"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Severity</FormLabel>
							<Select onValueChange={field.onChange} defaultValue={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select a severity level" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="low">Low</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High</SelectItem>
								</SelectContent>
							</Select>
							<FormDescription>
								High severity will send an immediate notification to admins.
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
							<FormLabel>Description of Incident</FormLabel>
							<FormControl>
								<Textarea
									placeholder="Provide a clear and concise description of what happened..."
									className="resize-none"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button type="submit">Log Incident</Button>
			</form>
		</Form>
	);
}
