'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { LoadStalled } from '@/components/ui/load-stalled';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { useGatherSystemShell } from '@/components/gatherKids/gathersystem-shell-context';
import {
	STAFF_CARD,
	STAFF_PAGE_TITLE,
	STAFF_SECTION_DESCRIPTION,
	STAFF_SECTION_TITLE,
	STAFF_TABLE_DENSE,
} from '@/components/gatherKids/staff-list-styles';
import { useToast } from '@/hooks/use-toast';
import {
	useCheckInEvents,
	useCreateCheckInEvent,
	useDeleteCheckInEvent,
	useEventUsage,
	useRenameCheckInEvent,
	useSetCheckInEventArchived,
} from '@/hooks/data';
import {
	MAX_EVENT_NAME_LENGTH,
	normalizeEventName,
	validateEventName,
	type CheckInEvent,
} from '@/lib/check-in-events';
import type { EventUsage } from '@/lib/dal/events';
import { cn } from '@/lib/utils';

const NO_USAGE: EventUsage = { attendanceCount: 0, onSiteCount: 0 };

function plural(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback;
}

/** Create or rename: one name field, validated before and after the round trip. */
function EventNameDialog({
	open,
	mode,
	event,
	events,
	isPending,
	onClose,
	onSubmit,
}: {
	open: boolean;
	mode: 'create' | 'rename';
	event: CheckInEvent | null;
	events: ReadonlyArray<CheckInEvent>;
	isPending: boolean;
	onClose: () => void;
	onSubmit: (name: string) => Promise<void>;
}) {
	const inputId = useId();
	const errorId = useId();
	const [name, setName] = useState(event?.name ?? '');
	const [error, setError] = useState<string | null>(null);
	const [attempted, setAttempted] = useState(false);
	const submitting = useRef(false);

	// Reset whenever the dialog opens for a (possibly different) event.
	const openKey = open ? `${mode}:${event?.id ?? ''}` : '';
	const [prevOpenKey, setPrevOpenKey] = useState(openKey);
	if (openKey !== prevOpenKey) {
		setPrevOpenKey(openKey);
		setName(event?.name ?? '');
		setError(null);
		setAttempted(false);
	}

	const close = () => {
		if (!isPending) onClose();
	};

	const submit = async () => {
		if (submitting.current) return;
		setAttempted(true);
		const problem = validateEventName(name, events, event?.id);
		if (problem) {
			setError(problem);
			return;
		}
		submitting.current = true;
		setError(null);
		try {
			await onSubmit(name);
			onClose();
		} catch (e) {
			setError(errorMessage(e, 'That did not save. Please try again.'));
		} finally {
			submitting.current = false;
		}
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !next && close()}>
			<DialogContent className="sm:max-w-md">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						void submit();
					}}
					className="space-y-4">
					<DialogHeader>
						<DialogTitle className="font-headline">
							{mode === 'create' ? 'Add an event' : `Rename ${event?.name ?? 'event'}`}
						</DialogTitle>
						<DialogDescription>
							{mode === 'create'
								? 'It will appear in the check-in event picker and as a transfer destination straight away.'
								: 'The new name shows everywhere, including on past attendance. The event and its history stay the same.'}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor={inputId}>Event name</Label>
						<Input
							id={inputId}
							value={name}
							maxLength={MAX_EVENT_NAME_LENGTH + 10}
							autoComplete="off"
							disabled={isPending}
							aria-invalid={!!error}
							aria-describedby={error ? errorId : undefined}
							onChange={(e) => {
								setName(e.target.value);
								if (attempted) setError(validateEventName(e.target.value, events, event?.id));
							}}
						/>
						{error && (
							<p id={errorId} role="alert" className="text-sm text-destructive">
								{error}
							</p>
						)}
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" onClick={close} disabled={isPending}>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending ? 'Saving…' : mode === 'create' ? 'Add event' : 'Save name'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

type Confirming =
	| { kind: 'archive'; event: CheckInEvent }
	| { kind: 'delete'; event: CheckInEvent }
	| { kind: 'cannot-delete'; event: CheckInEvent };

/** Archive / delete confirmations, and the "cannot delete" explanation. */
function ConfirmEventDialog({
	confirming,
	usage,
	isPending,
	error,
	onClose,
	onArchive,
	onDelete,
}: {
	confirming: Confirming | null;
	usage: EventUsage;
	isPending: boolean;
	error: string | null;
	onClose: () => void;
	onArchive: (event: CheckInEvent) => void;
	onDelete: (event: CheckInEvent) => void;
}) {
	const event = confirming?.event;
	const close = () => {
		if (!isPending) onClose();
	};

	let title = '';
	let body: React.ReactNode = null;
	let action: React.ReactNode = null;

	if (confirming?.kind === 'archive' && event) {
		title = `Archive ${event.name}?`;
		body = (
			<>
				<p>
					It will stop appearing in the check-in event picker and as a transfer destination.
					Its name and attendance history are kept, and you can restore it at any time.
				</p>
				{usage.onSiteCount > 0 && (
					<p className="font-medium text-foreground">
						{plural(usage.onSiteCount, 'child is', 'children are')} checked in there now.{' '}
						They stay checked in, and staff can still check them out or transfer them from
						this event&apos;s door until they leave.
					</p>
				)}
			</>
		);
		action = (
			<Button onClick={() => onArchive(event)} disabled={isPending} aria-busy={isPending}>
				{isPending ? 'Archiving…' : 'Archive event'}
			</Button>
		);
	} else if (confirming?.kind === 'delete' && event) {
		title = `Delete ${event.name}?`;
		body = (
			<p>
				This event has no attendance history, so it can be removed completely. This cannot be
				undone. If you might need it again, archive it instead.
			</p>
		);
		action = (
			<Button
				variant="destructive"
				onClick={() => onDelete(event)}
				disabled={isPending}
				aria-busy={isPending}>
				{isPending ? 'Deleting…' : 'Delete event'}
			</Button>
		);
	} else if (confirming?.kind === 'cannot-delete' && event) {
		title = `${event.name} can’t be deleted`;
		body = (
			<p>
				It has {plural(usage.attendanceCount, 'attendance record', 'attendance records')}.
				Deleting it would remove that history, so it can only be archived. An archived event
				takes no new check-ins and keeps its history.
			</p>
		);
		action = event.archived ? null : (
			<Button onClick={() => onArchive(event)} disabled={isPending} aria-busy={isPending}>
				{isPending ? 'Archiving…' : 'Archive instead'}
			</Button>
		);
	}

	return (
		<Dialog open={!!confirming} onOpenChange={(next) => !next && close()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="font-headline">{title}</DialogTitle>
					<DialogDescription asChild>
						<div className="space-y-2 text-sm text-muted-foreground">{body}</div>
					</DialogDescription>
				</DialogHeader>
				{error && (
					<p role="alert" className="rounded-md border border-destructive bg-destructive/5 p-3 text-sm text-destructive">
						{error}
					</p>
				)}
				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={close} disabled={isPending}>
						{action ? 'Cancel' : 'Close'}
					</Button>
					{action}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Admin screen for check-in events (#565): add, rename, archive, restore, and
 * delete an event that has never been used.
 *
 * Every rule here is also enforced by the database — only admins can write
 * `events`, a name cannot be blank, an event with attendance cannot be
 * deleted, and an archived event takes no new check-ins or transfers. This
 * screen checks first so the admin sees the right choice rather than a
 * refusal.
 */
export function EventsAdmin() {
	const gatherSystem = useGatherSystemShell();
	const { toast } = useToast();
	const {
		allEvents,
		isPersisted,
		isLoading,
		isError,
		refetch,
	} = useCheckInEvents();
	const usageQuery = useEventUsage(isPersisted);
	const usage = usageQuery.data;

	const createMutation = useCreateCheckInEvent();
	const renameMutation = useRenameCheckInEvent();
	const archiveMutation = useSetCheckInEventArchived();
	const deleteMutation = useDeleteCheckInEvent();

	const [nameDialog, setNameDialog] = useState<
		{ mode: 'create'; event: null } | { mode: 'rename'; event: CheckInEvent } | null
	>(null);
	const [confirming, setConfirming] = useState<Confirming | null>(null);
	const [confirmError, setConfirmError] = useState<string | null>(null);

	// Active first, in picker order; archived after.
	const rows = useMemo(
		() => [
			...allEvents.filter((e) => !e.archived),
			...allEvents.filter((e) => e.archived),
		],
		[allEvents]
	);

	const usageOf = (event: CheckInEvent): EventUsage => usage?.[event.id] ?? NO_USAGE;

	const openConfirm = (next: Confirming) => {
		setConfirmError(null);
		setConfirming(next);
	};

	const archive = async (event: CheckInEvent) => {
		setConfirmError(null);
		try {
			await archiveMutation.mutateAsync({ eventId: event.id, archived: true });
			setConfirming(null);
			toast({ title: 'Event archived', description: `${event.name} no longer takes check-ins.` });
		} catch (e) {
			setConfirmError(errorMessage(e, 'The event could not be archived. Please try again.'));
		}
	};

	const restore = async (event: CheckInEvent) => {
		try {
			await archiveMutation.mutateAsync({ eventId: event.id, archived: false });
			toast({ title: 'Event restored', description: `${event.name} is taking check-ins again.` });
		} catch (e) {
			toast({
				title: 'Restore failed',
				description: errorMessage(e, 'The event could not be restored. Please try again.'),
				variant: 'destructive',
			});
		}
	};

	const remove = async (event: CheckInEvent) => {
		setConfirmError(null);
		try {
			await deleteMutation.mutateAsync({ eventId: event.id });
			setConfirming(null);
			toast({ title: 'Event deleted', description: `${event.name} has been removed.` });
		} catch (e) {
			// Usually: a check-in landed since this screen last looked. Show the
			// explanation that now applies, with Archive offered.
			const reason = (e as { reason?: string } | null)?.reason;
			if (reason === 'has_history') {
				setConfirming({ kind: 'cannot-delete', event });
				setConfirmError(errorMessage(e, ''));
				return;
			}
			setConfirmError(errorMessage(e, 'The event could not be deleted. Please try again.'));
		}
	};

	const confirmPending = archiveMutation.isPending || deleteMutation.isPending;
	const confirmUsage = confirming ? usageOf(confirming.event) : NO_USAGE;

	if (isLoading) return <TableSkeleton rows={4} columns={4} />;

	if (isError) {
		return (
			<LoadStalled
				tone="error"
				title="Events didn’t load"
				description="The list of check-in events could not be fetched, so changing events now could act on a list you cannot see."
				onRetry={() => void refetch()}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className={cn(gatherSystem ? STAFF_PAGE_TITLE : 'text-3xl font-bold font-headline')}>
						Check-in events
					</h1>
					<p className="text-muted-foreground">
						The events staff check children into and transfer them between. Attendance is
						separate from ministry enrollment: changing events never enrolls or unenrolls anyone.
					</p>
				</div>
				<Button onClick={() => setNameDialog({ mode: 'create', event: null })}>
					<PlusCircle aria-hidden="true" />
					Add event
				</Button>
			</div>

			<Card className={cn(gatherSystem && STAFF_CARD)}>
				<CardHeader>
					<CardTitle className={cn(gatherSystem ? STAFF_SECTION_TITLE : 'font-headline')}>
						Events
					</CardTitle>
					<CardDescription className={cn(gatherSystem && STAFF_SECTION_DESCRIPTION)}>
						An event that has ever had attendance can be archived but not deleted, so its
						history is never lost.
					</CardDescription>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<Table className={cn(gatherSystem && STAFF_TABLE_DENSE)}>
						<TableHeader>
							<TableRow>
								<TableHead>Event</TableHead>
								<TableHead className="hidden sm:table-cell">Status</TableHead>
								<TableHead className="hidden sm:table-cell">Attendance</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.length === 0 && (
								<TableRow>
									<TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
										No check-in events yet. Add one to start checking children in.
									</TableCell>
								</TableRow>
							)}
							{rows.map((event) => {
								const u = usageOf(event);
								const usageKnown = !!usage;
								const hasHistory = u.attendanceCount > 0;
								const status = event.archived ? (
									<Badge variant="secondary">Archived</Badge>
								) : (
									<Badge className="bg-brand-aqua hover:opacity-90">Active</Badge>
								);
								const attendance = !usageKnown
									? usageQuery.isError
										? 'Unavailable'
										: 'Loading…'
									: hasHistory
										? `${plural(u.attendanceCount, 'record', 'records')}${
												u.onSiteCount > 0 ? ` · ${u.onSiteCount} on site now` : ''
											}`
										: 'No attendance yet';
								return (
									<TableRow key={event.id}>
										{/* On a phone, status and attendance sit under the name so the
										    actions stay on screen instead of behind a sideways scroll. */}
										<TableCell className="font-medium">
											<span>{event.name}</span>
											<span className="mt-1 flex flex-wrap items-center gap-2 text-sm font-normal text-muted-foreground sm:hidden">
												{status}
												<span>{attendance}</span>
											</span>
										</TableCell>
										<TableCell className="hidden sm:table-cell">{status}</TableCell>
										<TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
											{attendance}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setNameDialog({ mode: 'rename', event })}
													aria-label={`Rename ${event.name}`}>
													<Pencil aria-hidden="true" />
													<span className="hidden sm:inline">Rename</span>
												</Button>
												{event.archived ? (
													<Button
														variant="ghost"
														size="sm"
														disabled={archiveMutation.isPending}
														onClick={() => void restore(event)}
														aria-label={`Restore ${event.name}`}>
														<ArchiveRestore aria-hidden="true" />
														<span className="hidden sm:inline">Restore</span>
													</Button>
												) : (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => openConfirm({ kind: 'archive', event })}
														aria-label={`Archive ${event.name}`}>
														<Archive aria-hidden="true" />
														<span className="hidden sm:inline">Archive</span>
													</Button>
												)}
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive hover:text-destructive"
													// Until usage has loaded we cannot say which applies.
													disabled={!usageKnown}
													onClick={() =>
														openConfirm({ kind: hasHistory ? 'cannot-delete' : 'delete', event })
													}
													aria-label={`Delete ${event.name}`}>
													<Trash2 aria-hidden="true" />
													<span className="hidden sm:inline">Delete</span>
												</Button>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<EventNameDialog
				open={!!nameDialog}
				mode={nameDialog?.mode ?? 'create'}
				event={nameDialog?.event ?? null}
				events={allEvents}
				isPending={createMutation.isPending || renameMutation.isPending}
				onClose={() => setNameDialog(null)}
				onSubmit={async (name) => {
					if (nameDialog?.mode === 'rename') {
						const before = nameDialog.event.name;
						await renameMutation.mutateAsync({
							eventId: nameDialog.event.id,
							name,
							existing: allEvents,
						});
						toast({ title: 'Event renamed', description: `${before} is now ${normalizeEventName(name)}.` });
					} else {
						const created = await createMutation.mutateAsync({ name, existing: allEvents });
						toast({
							title: 'Event added',
							description: `${created.name} is ready for check-in.`,
						});
					}
				}}
			/>

			<ConfirmEventDialog
				confirming={confirming}
				usage={confirmUsage}
				isPending={confirmPending}
				error={confirmError}
				onClose={() => {
					setConfirming(null);
					setConfirmError(null);
				}}
				onArchive={(event) => void archive(event)}
				onDelete={(event) => void remove(event)}
			/>
		</div>
	);
}
