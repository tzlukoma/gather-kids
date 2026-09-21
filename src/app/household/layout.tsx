import React from 'react';
import { getGatherSystemGuardianFlag } from '@/lib/flags/get-gathersystem-guardian-flag';
import GuardianLayoutClient from '@/components/gatherKids/guardian-layout-client';

/**
 * Resolves `gathersystem_guardian` once per request and hands it to the
 * household shell, which publishes it to the pages inside.
 *
 * The chrome itself has to stay a client component — it reads the session, the
 * branding context and the pathname — so the layout is split the same way the
 * staff shell is: a server layout that only evaluates the flag, and a client
 * layout that decides what to draw.
 */
export default async function GuardianLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const useGatherSystemGuardian = await getGatherSystemGuardianFlag();

	return (
		<GuardianLayoutClient useGatherSystemGuardian={useGatherSystemGuardian}>
			{children}
		</GuardianLayoutClient>
	);
}

// Re-exported so the route's own tests can assert the gate through the layout
// module. The evaluation lives in
// `src/lib/flags/get-gathersystem-guardian-flag.ts`.
export { getGatherSystemGuardianFlag };
