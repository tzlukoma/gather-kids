'use client';

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { describeProblemPath, stepTitle } from './step-validation';
import type { StepProblem } from './step-validation';

interface RegistrationProblemSummaryProps {
	problems: StepProblem[];
	/** A step rule with no schema equivalent, e.g. duplicate custom questions. */
	blockMessage?: string | null;
	currentStep: number;
}

/**
 * What the wizard could not previously say.
 *
 * Before this, an invalid field on an unmounted step left the user on step 5
 * with a dead Submit button and nothing on screen tying the two together. The
 * summary names each problem, says which step owns it, and appears in the same
 * place every time so it is findable at mobile width without hunting.
 *
 * `role="alert"` rather than a toast: the list has to stay on screen while the
 * user works through it.
 */
export function RegistrationProblemSummary({
	problems,
	blockMessage,
	currentStep,
}: RegistrationProblemSummaryProps) {
	if (problems.length === 0 && !blockMessage) return null;

	const elsewhere = problems.filter((problem) => problem.step !== currentStep);
	const heading =
		problems.length === 0
			? 'Check this step before continuing'
			: problems.length === 1
				? 'One thing needs your attention'
				: `${problems.length} things need your attention`;

	return (
		<Alert
			variant="destructive"
			role="alert"
			data-testid="registration-problem-summary">
			<AlertTriangle className="h-4 w-4" />
			<AlertTitle>{heading}</AlertTitle>
			<AlertDescription>
				{blockMessage && <p className="mb-2">{blockMessage}</p>}

				{problems.length > 0 && (
					<ul className="list-disc pl-5 space-y-1 text-sm">
						{problems.map((problem) => (
							<li key={problem.path}>
								<span className="font-semibold">
									{describeProblemPath(problem.path)}:
								</span>{' '}
								{problem.message}
								{problem.step !== currentStep && (
									<span className="opacity-80">
										{' '}
										({stepTitle(problem.step)})
									</span>
								)}
							</li>
						))}
					</ul>
				)}

				{elsewhere.length > 0 && (
					<p className="mt-2 text-sm">
						We&apos;ve taken you back to {stepTitle(elsewhere[0].step)} to fix the
						first one.
					</p>
				)}
			</AlertDescription>
		</Alert>
	);
}
