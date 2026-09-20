'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The wizard's Back / Cancel / primary action row.
 *
 * Pinned to the bottom on phones only. Steps 4 and 5 are long enough that the
 * primary action was scrolled far below the fold, which on a phone reads as a
 * dead end. `-mx-4` bleeds the bar back through the content gutter so it spans
 * the screen, and the safe-area inset keeps it clear of the home indicator.
 *
 * From md up it goes back to being a card in the flow. Desktop has the room and
 * the layout stays aligned to the signed frame — and, the reason it is not
 * merely cosmetic, the global toast viewport sits bottom-right above sm, so a
 * bar pinned there would sit under every toast the wizard raises.
 *
 * It lives in its own file so the responsive contract is testable without
 * standing up the whole wizard — auth, flags, queries and a router — which is
 * how the 40px touch targets went unnoticed in the first place.
 */

/**
 * shadcn's default Button is `h-10`, which is 40px — under the 44px minimum a
 * touch target needs. `min-h-11` raises it on phones; from md up a pointer is
 * doing the work and the compact height is right again.
 */
export const ACTION_TOUCH_TARGET = 'min-h-11 md:min-h-10';

export type WizardActionBarProps = {
	currentStep: number;
	totalSteps: number;
	isSubmitting: boolean;
	onBack: () => void;
	onCancel: () => void;
	onNext: () => void;
};

export function WizardActionBar({
	currentStep,
	totalSteps,
	isSubmitting,
	onBack,
	onCancel,
	onNext,
}: WizardActionBarProps) {
	return (
		<div
			data-testid="wizard-action-bar"
			className="sticky bottom-0 z-30 -mx-4 border-t border-[#eae4da] bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:rounded-lg md:border md:p-6">
			<div className="mx-auto max-w-3xl">
				{/* `flex-wrap`: at phone widths Back + Cancel + Submit overflow one
				    row, which pushed Submit outside its container where it could not
				    be tapped at all. */}
				<div className="flex flex-wrap gap-3 justify-between">
					<div className="flex gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={onBack}
							disabled={currentStep === 1}
							className={`flex items-center gap-2 ${ACTION_TOUCH_TARGET}`}>
							<ChevronLeft className="h-4 w-4" />
							Back
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							className={`text-destructive hover:text-destructive ${ACTION_TOUCH_TARGET}`}>
							Cancel
						</Button>
					</div>

					{currentStep < totalSteps ? (
						<Button
							type="button"
							onClick={onNext}
							className={`flex items-center gap-2 bg-[#017c7d] hover:bg-[#016566] text-white ${ACTION_TOUCH_TARGET}`}>
							Save &amp; continue
							<ChevronRight className="h-4 w-4" />
						</Button>
					) : (
						<Button
							type="submit"
							disabled={isSubmitting}
							className={`bg-[#017c7d] hover:bg-[#016566] text-white ${ACTION_TOUCH_TARGET}`}>
							{isSubmitting ? 'Submitting...' : 'Submit registration'}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
