'use client';

import { useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowRightLeft } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { transferDestinations } from '@/lib/door-check-in';
import type { CheckInEvent } from '@/lib/check-in-events';
import type { EnrichedChild } from './check-in-view';

interface TransferCheckInDialogProps {
	/** The child to move. The dialog is open while this is non-null. */
	child: EnrichedChild | null;
	onClose: () => void;
	/**
	 * Perform the transfer. Resolve on success (the dialog closes); reject with
	 * an Error whose message is safe to show staff (the dialog stays open and
	 * shows it).
	 */
	onTransfer: (child: EnrichedChild, attendanceId: string, toEventId: string) => Promise<void>;
	isPending: boolean;
	/** The persisted check-in events (`useCheckInEvents`), destinations included. */
	events: ReadonlyArray<CheckInEvent>;
	/** Event name lookup from the same list. */
	nameOf: (eventId: string | null | undefined) => string;
}

/** An error the transfer reported, plus where the child is now if it knows. */
type ShownError = { message: string; currentEventId: string | null };

function formatCheckInTime(iso: string | undefined): string | null {
	if (!iso) return null;
	try {
		const at = parseISO(iso);
		return Number.isNaN(at.getTime()) ? null : format(at, 'h:mm a');
	} catch {
		return null;
	}
}

/**
 * Move a checked-in child from one event to another, without leaving the
 * check-in screen (#561). Shared by the GatherSystem and legacy door screens.
 *
 * This is not a pickup: the child stays on site, no pickup details are asked
 * for or recorded, and collecting them later still goes through the normal
 * check-out at the destination event.
 */
export function TransferCheckInDialog({
	child,
	onClose,
	onTransfer,
	isPending,
	events,
	nameOf,
}: TransferCheckInDialogProps) {
	const [destination, setDestination] = useState('');
	const [error, setError] = useState<ShownError | null>(null);
	// Guards a second tap landing before `isPending` re-renders the button.
	const submitting = useRef(false);

	const attendance = child?.activeAttendance ?? null;
	const sourceEventId = attendance?.event_id ?? null;
	const destinations = transferDestinations(events, sourceEventId);
	const destinationName = destinations.find((d) => d.id === destination)?.name;
	const checkedInAt = formatCheckInTime(attendance?.check_in_at);
	const childName = child ? `${child.first_name} ${child.last_name}` : '';

	const handleClose = () => {
		if (isPending) return;
		setDestination('');
		setError(null);
		onClose();
	};

	const handleConfirm = async () => {
		if (!child || !attendance || !destination || submitting.current) return;
		submitting.current = true;
		setError(null);
		try {
			await onTransfer(child, attendance.attendance_id, destination);
			setDestination('');
			onClose();
		} catch (e) {
			// Never claim nothing changed unless the error says so: a lost
			// response leaves the outcome unknown (see `transferCheckIn`).
			const currentEventId =
				e && typeof e === 'object' && 'currentEventId' in e
					? ((e as { currentEventId?: string | null }).currentEventId ?? null)
					: null;
			setError({
				message:
					e instanceof Error && e.message
						? e.message
						: 'Unable to confirm the transfer. Check where the child is on the roster before trying again.',
				currentEventId,
			});
		} finally {
			submitting.current = false;
		}
	};

	return (
		<Dialog open={!!child} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="font-headline">Transfer {childName}</DialogTitle>
					<DialogDescription>
						Move {child?.first_name} to another event. They stay checked in and on
						site — this is not a pickup.
					</DialogDescription>
				</DialogHeader>

				<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border p-3 text-sm">
					<dt className="text-muted-foreground">Currently in</dt>
					<dd className="font-medium">
						{nameOf(sourceEventId) || 'Unknown event'}
					</dd>
					{checkedInAt && (
						<>
							<dt className="text-muted-foreground">Checked in</dt>
							<dd>{checkedInAt}</dd>
						</>
					)}
				</dl>

				{destinations.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No other events are set up for check-in.
					</p>
				) : (
					<fieldset className="space-y-2" disabled={isPending}>
						<legend className="mb-2 text-sm font-medium">Transfer to</legend>
						<RadioGroup
							value={destination}
							onValueChange={(value) => {
								setDestination(value);
								setError(null);
							}}
							className="space-y-2">
							{destinations.map((event) => (
								<Label
									key={event.id}
									htmlFor={`transfer-destination-${event.id}`}
									className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50 has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-muted">
									<RadioGroupItem
										value={event.id}
										id={`transfer-destination-${event.id}`}
									/>
									<span>{event.name}</span>
								</Label>
							))}
						</RadioGroup>
					</fieldset>
				)}

				<p className="text-xs text-muted-foreground">
					Their arrival time and today&apos;s check-in history are kept. Pickup at
					the new event still needs the usual verification.
				</p>

				{error && (
					<div role="alert" className="space-y-1 rounded-md border border-destructive bg-destructive/5 p-3 text-sm text-destructive">
						<p>{error.message}</p>
						{error.currentEventId && (
							<p className="font-medium">
								{child?.first_name} is currently checked in to{' '}
								{nameOf(error.currentEventId)}.
							</p>
						)}
					</div>
				)}

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={handleClose} disabled={isPending}>
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={!destination || !attendance || isPending}
						aria-busy={isPending}>
						<ArrowRightLeft aria-hidden="true" />
						{isPending
							? 'Transferring…'
							: destinationName
								? `Transfer to ${destinationName}`
								: 'Transfer'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
