'use client';

import * as React from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type LoadStalledTone = 'slow' | 'error';

/**
 * Shown in place of a skeleton when a load has stalled or failed.
 *
 * The two tones say different things and must not be collapsed: `slow` means
 * the request is still running and may yet succeed, `error` means it already
 * failed. Telling someone a request failed when it has not, or that it is
 * still coming when it is not, are both dishonest in the way an indefinite
 * skeleton is dishonest.
 */
export function LoadStalled({
	tone = 'slow',
	title,
	description,
	onRetry,
	retryLabel = 'Try again',
	className,
}: {
	tone?: LoadStalledTone;
	title?: string;
	description?: string;
	onRetry?: () => void;
	retryLabel?: string;
	className?: string;
}) {
	const isError = tone === 'error';
	const Icon = isError ? AlertTriangle : Clock;

	const heading =
		title ?? (isError ? 'This didn’t load' : 'Still loading');
	const body =
		description ??
		(isError
			? 'Something went wrong fetching this data.'
			: 'This is taking longer than expected. It may still arrive.');

	return (
		<div
			role="status"
			data-testid="load-stalled"
			data-tone={tone}
			className={cn(
				'flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center',
				className
			)}>
			<Icon
				aria-hidden="true"
				className={cn('h-5 w-5', isError ? 'text-destructive' : 'text-muted-foreground')}
			/>
			<p className="text-title-18 text-foreground">{heading}</p>
			<p className="text-body-14 text-muted-foreground max-w-prose">{body}</p>
			{onRetry ? (
				<Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
					<RefreshCw className="mr-2 h-4 w-4" />
					{retryLabel}
				</Button>
			) : null}
		</div>
	);
}
