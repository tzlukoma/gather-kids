'use client';

import { Check, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	formatMinistryLabels,
	type SiblingMinistryStatus,
} from './sibling-ministry-status';

interface SiblingMinistryCardProps {
	statuses: SiblingMinistryStatus[];
	/** The child currently under review, or -1. */
	reviewingChildIndex: number;
	onReview: (status: SiblingMinistryStatus) => void;
	onStopReviewing: () => void;
}

/**
 * "Amara's ministries already saved" (`29:70`).
 *
 * A returning household's step 4 arrives pre-ticked from last year, and a
 * prefilled checkbox is indistinguishable from one the parent just ticked. This
 * names each sibling whose choices were carried over and what they kept, so a
 * parent registering three children can tell which ones still need attention.
 *
 * Review marks that child's rows down the page rather than navigating away.
 * The spec's locked decision is to jump to that child's ministry step and
 * resume; step 4 is ministry-centric today, with no per-child screen to jump
 * to, so this brings the child's context to the guardian instead. The per-child
 * restructure is tracked separately — see the PR.
 */
export function SiblingMinistryCard({
	statuses,
	reviewingChildIndex,
	onReview,
	onStopReviewing,
}: SiblingMinistryCardProps) {
	if (statuses.length === 0) return null;

	const reviewing = statuses.find(
		(status) => status.childIndex === reviewingChildIndex
	);

	return (
		<div
			data-testid="sibling-ministry-status"
			className="rounded-lg border border-[#017c7d] bg-[#e8f5f5] p-4 space-y-3">
			<p className="text-sm font-semibold text-[#1e2a2f]">
				Already saved from last year
			</p>

			<ul className="space-y-2">
				{statuses.map((status) => (
					<li
						key={status.childId}
						className="flex flex-wrap items-start justify-between gap-2">
						<span className="min-w-0 flex-1 text-sm text-[#1e2a2f]">
							<span className="inline-flex items-center gap-1.5 font-semibold">
								<Check className="h-3.5 w-3.5 text-[#017c7d]" />
								{status.name}&apos;s ministries already saved
							</span>
							<span className="block text-xs text-[#5b6b72]">
								{formatMinistryLabels(status.ministryLabels)}
							</span>
						</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="flex-none border-[#017c7d] text-[#017c7d] hover:bg-white"
							aria-pressed={status.childIndex === reviewingChildIndex}
							onClick={() => onReview(status)}>
							Review
						</Button>
					</li>
				))}
			</ul>

			{reviewing && (
				<div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#017c7d]/30 pt-3">
					<p
						className="text-xs text-[#1e2a2f]"
						role="status"
						aria-live="polite">
						Reviewing {reviewing.name}&apos;s ministries — their choices are
						highlighted below.
					</p>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="flex-none text-[#017c7d]"
						onClick={onStopReviewing}>
						<Undo2 className="mr-1 h-3.5 w-3.5" />
						Done reviewing
					</Button>
				</div>
			)}
		</div>
	);
}
