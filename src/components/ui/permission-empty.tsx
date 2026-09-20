import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Why a staff list is showing nothing.
 *
 * `empty`      — the query ran and there genuinely are no rows.
 * `restricted` — rows may well exist; this account is not allowed to see them.
 *
 * Keeping these apart is the point of the component. "No children" on a screen
 * that is actually withholding children is a lie the reader cannot detect, and
 * it sends people hunting for missing data instead of asking for access. The
 * two states get different icons and different wording so the difference is
 * visible at a glance.
 */
export type PermissionEmptyReason = 'empty' | 'restricted';

export interface PermissionEmptyProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
	reason?: PermissionEmptyReason;
	/** What the reader is looking at, e.g. "No ministry assigned". */
	title: string;
	/** Why it is empty, in plain words. */
	description?: string;
	/**
	 * Who can change it. Shown only for `restricted`, because "ask your
	 * administrator" is noise on a list that is simply empty.
	 */
	remedy?: string;
	/** Optional call to action (e.g. a Button). */
	action?: React.ReactNode;
	icon?: LucideIcon;
}

/**
 * Honest empty state for staff lists.
 *
 * Styled with the GatherSystem type and elevation tokens; safe to render on the
 * legacy surface too, since it only uses shared tokens.
 */
function PermissionEmpty({
	reason = 'empty',
	title,
	description,
	remedy,
	action,
	icon,
	className,
	...props
}: PermissionEmptyProps) {
	const restricted = reason === 'restricted';
	const Icon = icon ?? (restricted ? Lock : Inbox);

	return (
		<div
			role="status"
			data-testid="permission-empty"
			data-reason={reason}
			className={cn(
				'flex flex-col items-center justify-center gap-3 rounded-lg px-6 py-12 text-center',
				className
			)}
			{...props}>
			<Icon
				className={cn(
					'h-10 w-10',
					restricted ? 'text-brand-teal' : 'text-muted-foreground'
				)}
				aria-hidden="true"
			/>
			<h3 className="text-title-18 text-foreground">{title}</h3>
			{description ? (
				<p className="text-body-14 max-w-prose text-muted-foreground">
					{description}
				</p>
			) : null}
			{restricted && remedy ? (
				<p className="text-body-13 max-w-prose text-muted-foreground">
					{remedy}
				</p>
			) : null}
			{action ? <div className="mt-1">{action}</div> : null}
		</div>
	);
}

export { PermissionEmpty };
