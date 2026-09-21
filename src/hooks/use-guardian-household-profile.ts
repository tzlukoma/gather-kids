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
 */
export function useGuardianHouseholdProfile() {
	const { user } = useAuth();
	const router = useRouter();
	const [householdId, setHouseholdId] = useState<string | null>(null);

	const {
		data: profileData,
		isLoading,
		error,
	} = useHouseholdProfile(householdId || '');

	useEffect(() => {
		const load = async () => {
			if (!user?.uid) return;
			if (isOfflineSupabase()) return;

			try {
				const needsRegistration = await needsRegistrationForActiveCycle(user.uid);
				if (needsRegistration) {
					router.replace('/register');
					return;
				}
			} catch (loadError) {
				console.error('HouseholdPage: registration check failed:', loadError);
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
				router.replace('/register');
				return;
			}

			setHouseholdId(targetHouseholdId);
		};
		load();
	}, [user, router]);

	return { profileData, isLoading, error };
}
