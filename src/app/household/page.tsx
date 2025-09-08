'use client';

import { useAuth } from '@/contexts/auth-context';
import { HouseholdProfile } from '@/components/gatherKids/household-profile';
import { OnboardingModal } from '@/components/gatherKids/onboarding-modal';
import AuthDebug from '@/components/AuthDebug';
import { useEffect, useState } from 'react';
import { getHouseholdProfile } from '@/lib/dal';
import type { HouseholdProfileData } from '@/lib/dal';

export default function GuardianHouseholdPage() {
	const { user } = useAuth();
	const [profileData, setProfileData] = useState<HouseholdProfileData | null>(
		null
	);
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [householdId, setHouseholdId] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			if (!user) return;

			// First try to get household_id from user metadata
			let targetHouseholdId = user.metadata?.household_id ?? undefined;

			// If not available, try to find it using user_households table
			if (!targetHouseholdId && user?.uid) {
				const { getHouseholdForUser } = await import('@/lib/dal');
				targetHouseholdId = (await getHouseholdForUser(user.uid)) ?? undefined;
			}

			if (!targetHouseholdId) return;

			setHouseholdId(targetHouseholdId);
			const data = await getHouseholdProfile(targetHouseholdId);
			console.log('DEBUG: Household profile data:', data);
			console.log(
				'DEBUG: Children with enrollments:',
				data.children.map((c) => ({
					childName: `${c.first_name} ${c.last_name}`,
					enrollmentsByCycle: c.enrollmentsByCycle,
					enrollmentCount: Object.values(c.enrollmentsByCycle).flat().length,
				}))
			);
			setProfileData(data);
		};
		load();
	}, [user]);

	useEffect(() => {
		// Check if this is a first-time user who hasn't dismissed onboarding
		if (user && !user.metadata?.onboarding_dismissed) {
			// Check if onboarding has already been shown in this session
			const sessionKey = `onboarding_shown_${user.uid}`;
			const alreadyShownThisSession = sessionStorage.getItem(sessionKey);

			if (!alreadyShownThisSession) {
				// For demo purposes, show onboarding for the demo parent on first login of session
				if (user.uid === 'user_parent_demo') {
					setShowOnboarding(true);
					// Mark as shown for this session
					sessionStorage.setItem(sessionKey, 'true');
				}
			}
		}
	}, [user]);

	if (!profileData) return <div>Loading household...</div>;

	return (
		<div>
			<HouseholdProfile profileData={profileData} />

			<AuthDebug className="mt-4" user={user} />

			<OnboardingModal
				isOpen={showOnboarding}
				onClose={() => setShowOnboarding(false)}
			/>
		</div>
	);
}
