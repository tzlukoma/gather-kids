'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useHouseholdProfile } from '@/hooks/data';
import {
	getHouseholdForUser,
	needsRegistrationForActiveCycle,
} from '@/lib/dal';
import { isOfflineSupabase } from '@/lib/offline-supabase';

/**
 * Resolves the signed-in guardian's own household profile.
 *
 * Lifted out of `/household/page.tsx` unchanged so `/household/details` — which
 * shows the same record once the GatherSystem home takes the section root — can
 * load it the same way. Two copies of the household lookup, the registration
 * check and the `/register` redirects would be two places for them to drift.
 *
 * The household id comes from the session's own metadata first and from
 * `user_households` second; a guardian with neither is sent to `/register`.
 * Nothing here widens what the caller may read.
 *
 * `redirectToRegistration: false` skips the registration check and both
 * redirects. The child page uses it: the legacy page never sent a guardian to
 * `/register`, and a page reached from a link should not start doing so. With
 * the redirects off, `householdMissing` reports a guardian with no household so
 * the page can say so instead of loading forever.
 */
export function useGuardianHouseholdProfile(options?: {
	redirectToRegistration?: boolean;
}) {
	const redirectToRegistration = options?.redirectToRegistration ?? true;
	const { user } = useAuth();
	const router = useRouter();
	const [householdId, setHouseholdId] = useState<string | null>(null);
	const [householdMissing, setHouseholdMissing] = useState(false);

	const {
		data: profileData,
		isLoading,
		error,
	} = useHouseholdProfile(householdId || '');

	useEffect(() => {
		const load = async () => {
			if (!user?.uid) return;
			if (isOfflineSupabase()) return;

			if (redirectToRegistration) {
				try {
					const needsRegistration = await needsRegistrationForActiveCycle(user.uid);
					if (needsRegistration) {
						router.replace('/register');
						return;
					}
				} catch (loadError) {
					console.error('HouseholdPage: registration check failed:', loadError);
				}
			}

			let targetHouseholdId = user.metadata?.household_id ?? undefined;

			if (!targetHouseholdId) {
				try {
					targetHouseholdId =
						(await getHouseholdForUser(user.uid)) ?? undefined;
				} catch (loadError) {
					console.error('HouseholdPage: getHouseholdForUser failed:', loadError);
				}
			}

			if (!targetHouseholdId) {
				if (redirectToRegistration) {
					router.replace('/register');
				} else {
					setHouseholdMissing(true);
				}
				return;
			}

			setHouseholdId(targetHouseholdId);
		};
		load();
	}, [user, router, redirectToRegistration]);

	return {
		profileData,
		isLoading,
		error,
		// Until the household id resolves the query is disabled, which react-query
		// reports as not loading. This lets a page tell that wait apart from
		// "loaded, and the child is not here".
		householdResolved: householdId !== null || householdMissing,
		householdMissing,
	};
}
