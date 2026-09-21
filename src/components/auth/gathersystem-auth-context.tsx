'use client';

import * as React from 'react';

/**
 * Shares the server-evaluated `gathersystem_auth` flag with the account pages.
 *
 * Same shape and same reasoning as `GatherSystemShellProvider`: the route
 * layout resolves the flag once on the server, and route segments do not
 * inherit a layout's props, so the answer is published rather than re-read.
 *
 * Defaults to `false`, so a page rendered outside the provider gets legacy.
 * That matches `getGatherSystemFlag`, which also fails closed.
 */
const GatherSystemAuthContext = React.createContext(false);

export function GatherSystemAuthProvider({
	value,
	children,
}: {
	value: boolean;
	children: React.ReactNode;
}) {
	return (
		<GatherSystemAuthContext.Provider value={value}>
			{children}
		</GatherSystemAuthContext.Provider>
	);
}

/** `true` when the account surface should render its GatherSystem treatment. */
export function useGatherSystemAuth(): boolean {
	return React.useContext(GatherSystemAuthContext);
}
