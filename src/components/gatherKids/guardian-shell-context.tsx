'use client';

import * as React from 'react';

/**
 * Shares the server-evaluated `gathersystem_guardian` flag with the pages
 * rendered inside the household shell.
 *
 * Same reasoning as `GatherSystemShellProvider` on the staff side: the
 * `/household` layout resolves the flag once per request, and route segments do
 * not inherit a layout's props, so without this every household page would need
 * its own server wrapper and its own evaluation. It keeps one read per request
 * and keeps the whole household surface on one side of the flag — a
 * GatherSystem tab bar wrapped around the legacy household profile is not a
 * state anyone designed.
 *
 * A separate context from the staff one on purpose: they are separate flags and
 * a guardian is never inside the admin shell.
 *
 * Defaults to `false`, so a page rendered outside the provider gets legacy.
 * That matches `getGatherSystemFlag`, which also fails closed.
 */
const GuardianShellContext = React.createContext(false);

export function GuardianShellProvider({
	value,
	children,
}: {
	value: boolean;
	children: React.ReactNode;
}) {
	return (
		<GuardianShellContext.Provider value={value}>
			{children}
		</GuardianShellContext.Provider>
	);
}

/** `true` when the household surface should render its GatherSystem treatment. */
export function useGuardianShell(): boolean {
	return React.useContext(GuardianShellContext);
}
