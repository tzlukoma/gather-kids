import React from 'react';
import { getGatherSystemAuthFlag } from '@/lib/flags/get-gathersystem-auth-flag';
import { GatherSystemAuthProvider } from '@/components/auth/gathersystem-auth-context';

/**
 * Resolves `gathersystem_auth` once per request and publishes it to the page.
 *
 * A layout rather than a server/legacy page split: the GatherSystem change
 * here is a set of class names, so forking the page would mean maintaining two
 * copies of the session handling and redirects in order to restyle a heading.
 */
export default async function UnauthorizedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const useGatherSystemAuth = await getGatherSystemAuthFlag();

	return (
		<GatherSystemAuthProvider value={useGatherSystemAuth}>
			{children}
		</GatherSystemAuthProvider>
	);
}
