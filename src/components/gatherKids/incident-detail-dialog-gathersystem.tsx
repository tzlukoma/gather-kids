'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Incident } from '@/lib/types';
import { format } from 'date-fns';

/**
 * Incident detail for the GatherSystem incidents screen. Ships with its owning
 * screen; the shared `IncidentDetailsDialog` used by rosters and check-in is
 * left untouched on the legacy path.
 *
 * `canAcknowledge` is resolved by the caller using the same ADMIN + not-yet-
 * acknowledged check as the inline list action, so detail can never acknowledge
 * something the list would refuse.
 */
export function IncidentDetailDialogGatherSystem({
	incident,
	canAcknowledge,
	isAcknowledging,
	onAcknowledge,
	onClose,
}: {
	incident: Incident | null;
	canAcknowledge: boolean;
	isAcknowledging: boolean;
	onAcknowledge: (incidentId: string) => void;
	onClose: () => void;
}) {
	if (!incident) return null;

	const acknowledged = !!incident.admin_acknowledged_at;

	return (
		<Dialog open={!!incident} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="font-headline">Incident Details</DialogTitle>
					<DialogDescription>
						Reported for {incident.child_name}.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<DetailRow label="Child" value={incident.child_name} />
					<DetailRow
						label="Date & Time"
						value={format(new Date(incident.timestamp), 'PPpp')}
					/>
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Severity</span>
						<Badge
							variant={
								incident.severity === 'high'
									? 'destructive'
									: incident.severity === 'medium'
									? 'secondary'
									: 'outline'
							}
							className="capitalize">
							{incident.severity}
						</Badge>
					</div>
					<div>
						<p className="mb-1 text-sm text-muted-foreground">Description</p>
						<p className="rounded-md bg-muted p-3 text-sm">
							{incident.description}
						</p>
					</div>
					<DetailRow label="Reported By" value={incident.leader_id} fallback="Unknown" />
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Status</span>
						<Badge
							variant={acknowledged ? 'default' : 'destructive'}
							className={acknowledged ? 'bg-brand-aqua hover:opacity-90' : ''}>
							{acknowledged ? 'Acknowledged' : 'Pending'}
						</Badge>
					</div>
					{acknowledged && (
						<p className="text-xs text-muted-foreground">
							Acknowledged{' '}
							{format(new Date(incident.admin_acknowledged_at!), 'PPpp')}
						</p>
					)}
				</div>

				<DialogFooter className="gap-2 sm:gap-2">
					{canAcknowledge && (
						<Button
							disabled={isAcknowledging}
							onClick={() => onAcknowledge(incident.incident_id)}>
							Acknowledge
						</Button>
					)}
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DetailRow({
	label,
	value,
	fallback = '—',
}: {
	label: string;
	value?: string | null;
	fallback?: string;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="font-medium text-right">{value || fallback}</span>
		</div>
	);
}
