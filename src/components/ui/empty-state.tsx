import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Lucide icon component shown above the title. Defaults to Inbox. */
	icon?: LucideIcon;
	/** Primary empty-state heading. */
	title: string;
	/** Optional supporting copy under the title. */
	description?: string;
	/** Optional call-to-action (e.g. a Button). */
	action?: React.ReactNode;
}

/**
 * Shared empty-list placeholder: icon + title + optional description + optional CTA.
 * Use on check-in, rosters, and other lists that can render with zero items.
 */
function EmptyState({
	icon: Icon = Inbox,
	title,
	description,
	action,
	className,
	...props
}: EmptyStateProps) {
	return (
		<div
			role="status"
			className={cn(
				'flex flex-col items-center justify-center gap-2 py-12 text-center',
				className
			)}
			{...props}>
			<Icon
				className="h-12 w-12 text-muted-foreground"
				aria-hidden="true"
			/>
			<h3 className="text-lg font-semibold tracking-tight">{title}</h3>
			{description ? (
				<p className="max-w-sm text-sm text-muted-foreground">{description}</p>
			) : null}
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	);
}

export { EmptyState };
