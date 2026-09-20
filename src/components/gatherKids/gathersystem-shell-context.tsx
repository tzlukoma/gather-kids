'use client';

import * as React from 'react';

/**
 * Shares the server-evaluated `gathersystem_admin` flag with the staff pages
 * rendered inside the admin shell.
 *
 * The `(admin)` layout already resolves the flag on the server and hands it to
 * `AdminLayoutClient`. Route segments do not inherit a layout's props, so
 * without this every staff page would need its own server wrapper and its own
 * flag read. Publishing the layout's single answer keeps one evaluation per
 * request and keeps every staff surface on the same side of the flag — a
 * GatherSystem shell around a legacy table is not a state anyone designed.
 *
 * Defaults to `false`, so a page rendered outside the provider (a test, a
 * Storybook-style harness, a future route that forgets to wrap) gets legacy.
 * That matches `getGatherSystemFlag`, which also fails closed.
 */
const GatherSystemShellContext = React.createContext(false);

export function GatherSystemShellProvider({
	value,
	children,
}: {
	value: boolean;
	children: React.ReactNode;
}) {
	return (
		<GatherSystemShellContext.Provider value={value}>
			{children}
		</GatherSystemShellContext.Provider>
	);
}

/** `true` when the staff surface should render its GatherSystem treatment. */
export function useGatherSystemShell(): boolean {
	return React.useContext(GatherSystemShellContext);
}
