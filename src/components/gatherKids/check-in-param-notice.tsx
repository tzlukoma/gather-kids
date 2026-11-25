import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckInParamNoticeProps {
	/** Which URL parameter could not be read. */
	param: 'filter' | 'event';
	/** The raw URL value that was not understood (preserved verbatim). */
	raw: string;
	/** Accepted values or event names to display. */
	accepted: string[];
	/** Called when the user dismisses this notice. */
	onDismiss: () => void;
}

/**
 * A dismissible inline notice for an unreadable `?filter=` or `?event=` value.
 *
 * The fallback is intentional, so this is informational rather than
 * destructive. It uses muted tokens only — Rule A reserves marigold/yellow for
 * door-staff check-in/check-out CTAs, not announcements.
 */
export function CheckInParamNotice({
	param,
	raw,
	accepted,
	onDismiss,
}: CheckInParamNoticeProps) {
	const label = param === 'filter' ? 'Unreadable filter' : 'Unreadable event';
	const valueLabel = param === 'filter' ? 'value' : 'event';
	const acceptedLabel = param === 'filter' ? 'Accepted values' : 'Accepted events';

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label={label}
			className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
			<div className="flex items-start gap-3">
				<Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
				<div className="flex-1 min-w-0">
					<p>
						Could not read {valueLabel}{' '}
						<span className="font-medium text-foreground">&ldquo;{raw}&rdquo;</span>.
						{' '}
						{acceptedLabel}:{' '}
						<span className="text-foreground">{accepted.join(', ')}</span>.
					</p>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 shrink-0 -mr-1 mt-0.5"
					aria-label={`Dismiss ${param} notice`}
					onClick={onDismiss}>
					<X aria-hidden="true" className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
