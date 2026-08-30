'use client';

import { useAuth } from '@/contexts/auth-context';
import { HouseholdProfile } from '@/components/gatherKids/household-profile';
import { OnboardingModal } from '@/components/gatherKids/onboarding-modal';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHouseholdProfile } from '@/hooks/data';
import {
	getHouseholdForUser,
	needsRegistrationForActiveCycle,
} from '@/lib/dal';
import { GuardianSkeleton } from '@/components/skeletons/guardian-skeleton';

export default function GuardianHouseholdPage() {
	const { user } = useAuth();
	const router = useRouter();
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [householdId, setHouseholdId] = useState<string | null>(null);

	const {
		data: profileData,
		isLoading,
		error,
	} = useHouseholdProfile(householdId || '');

	useEffect(() => {
		const load = async () => {
			if (!user?.uid) return;

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

	useEffect(() => {
		if (user && !user.metadata?.onboarding_dismissed) {
			const sessionKey = `onboarding_shown_${user.uid}`;
			const alreadyShownThisSession = sessionStorage.getItem(sessionKey);

			if (!alreadyShownThisSession && user.uid === 'user_parent_demo') {
				setShowOnboarding(true);
				sessionStorage.setItem(sessionKey, 'true');
			}
		}
	}, [user]);

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

			<OnboardingModal
				isOpen={showOnboarding}
				onClose={() => setShowOnboarding(false)}
			/>
		</div>
	);
}
