'use client';

import { CheckCircle, Smartphone } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { formatPhone } from '@/hooks/usePhoneFormat';
import type { EnrichedChild } from '@/components/gatherKids/check-in-view';

export interface ChildInfoPopoverContentProps {
	child: EnrichedChild;
	/**
	 * Render the child's name inside the self-checkout block. The legacy
	 * ChildCard includes it; the GatherSystem door shows the name in a header
	 * above this component and omits it here.
	 */
	showSelfCheckoutName?: boolean;
	/**
	 * `minimal` matches ChildCard: one separator between guardians and
	 * emergency contact. `all` matches the GatherSystem door: separators
	 * between every section.
	 */
	showSeparators?: 'minimal' | 'all';
}

/**
 * Shared popover content for child guardian/contact details.
 *
 * Extracted from child-card.tsx and check-in-content-gathersystem.tsx (#455)
 * so the legacy card and GatherSystem door render the same fields from one
 * source of truth. Callers keep their own trigger, header, and outer layout.
 */
export function ChildInfoPopoverContent({
	child,
	showSelfCheckoutName = true,
	showSeparators = 'minimal',
}: ChildInfoPopoverContentProps) {
	const canSelfCheckout = child.age !== null && child.age >= 13;

	return (
		<>
			{canSelfCheckout && child.child_mobile && (
				<div>
					<h4 className="font-semibold font-headline mb-2 flex items-center gap-2">
						<CheckCircle
							aria-hidden="true"
							className="h-4 w-4 text-green-500"
						/>{' '}
						Self-Checkout Allowed
					</h4>
					<div className="text-sm">
						{showSelfCheckoutName && (
							<p className="font-medium">
								{child.first_name} {child.last_name}
							</p>
						)}
						<p className="text-muted-foreground flex items-center gap-2">
							<Smartphone aria-hidden="true" size={14} />
							{child.child_mobile ? formatPhone(child.child_mobile) : 'N/A'}
						</p>
					</div>
				</div>
			)}

			{showSeparators === 'all' && <Separator />}

			<div>
				<h4 className="font-semibold font-headline mb-2">Guardians</h4>
				<div className="space-y-3">
					{child.guardians?.map((g) => (
						<div key={g.guardian_id} className="text-sm">
							<p className="font-medium">
								{g.first_name} {g.last_name} ({g.relationship})
							</p>
							<p className="text-muted-foreground">
								{g.mobile_phone ? formatPhone(g.mobile_phone) : 'N/A'}
							</p>
						</div>
					))}
					{!child.guardians?.length && (
						<p className="text-sm text-muted-foreground">
							No guardian information available.
						</p>
					)}
				</div>
			</div>

			<Separator />

			<div>
				<h4 className="font-semibold font-headline mb-2">Emergency Contact</h4>
				{child.emergencyContact ? (
					<div className="text-sm">
						<p className="font-medium">
							{child.emergencyContact.first_name}{' '}
							{child.emergencyContact.last_name} (
							{child.emergencyContact.relationship})
						</p>
						<p className="text-muted-foreground">
							{child.emergencyContact.mobile_phone
								? formatPhone(child.emergencyContact.mobile_phone)
								: 'N/A'}
						</p>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						No emergency contact available.
					</p>
				)}
			</div>
		</>
	);
}
