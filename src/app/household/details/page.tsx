'use client';

import { HouseholdProfile } from '@/components/gatherKids/household-profile';
import { useGuardianHouseholdProfile } from '@/hooks/use-guardian-household-profile';
import { GuardianSkeleton } from '@/components/skeletons/guardian-skeleton';
import { isOfflineSupabase } from '@/lib/offline-supabase';

/**
 * The household record — guardians, address, emergency contact, per-child
 * detail — which is what `/household` shows today.
 *
 * It gets its own route because the GatherSystem home takes `/household`, and
 * the record has to stay reachable: the shell's `Household` tab points here.
 * Deliberately the same `HouseholdProfile` component, unmodified, so the flag
 * moves the screen without changing it. Restyling this screen is #378.
 */
export default function GuardianHouseholdDetailsPage() {
	const { profileData, isLoading, error } = useGuardianHouseholdProfile();

	if (isOfflineSupabase()) {
		return (
			<div className="container mx-auto px-4 py-6">
				<h1 className="text-2xl font-headline font-semibold">Household</h1>
				<p className="mt-2 text-muted-foreground">
					Thank you for registering. Your family&apos;s registration has been
					received.
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto px-4 py-6">
				<p className="text-destructive">
					Failed to load household data. Please refresh the page.
				</p>
			</div>
		);
	}

	if (isLoading || !profileData) return <GuardianSkeleton />;

	return (
		<div>
			<HouseholdProfile profileData={profileData} />
		</div>
	);
}
