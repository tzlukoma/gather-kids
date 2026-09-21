'use client';

import * as React from 'react';

/** How long a load may run before the UI stops pretending it is fine. */
export const DEFAULT_LOADING_TIMEOUT_MS = 10_000;

/**
 * Reports whether a load has been running longer than `timeoutMs`.
 *
 * A skeleton is a promise that something is about to arrive. When a request
 * hangs, that promise silently becomes false and the screen animates forever
 * with nothing behind it. This lets a screen stop making the promise and say
 * what is actually happening.
 *
 * Both writes are asynchronous on purpose. Clearing the previous verdict when
 * a fresh load starts is what stops a retry inheriting the last attempt's
 * answer, and doing it in a microtask rather than straight in the effect body
 * keeps it clear of `react-hooks/set-state-in-effect`.
 */
export function useLoadingTimeout(
	isLoading: boolean,
	timeoutMs: number = DEFAULT_LOADING_TIMEOUT_MS
): boolean {
	const [overdue, setOverdue] = React.useState(false);

	React.useEffect(() => {
		if (!isLoading) return;

		let cancelled = false;
		queueMicrotask(() => {
			if (!cancelled) setOverdue(false);
		});
		const id = setTimeout(() => {
			if (!cancelled) setOverdue(true);
		}, timeoutMs);

		return () => {
			cancelled = true;
			clearTimeout(id);
		};
	}, [isLoading, timeoutMs]);

	return isLoading && overdue;
}
