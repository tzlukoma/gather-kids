'use client';

import { useAuth } from '@/contexts/auth-context';
import { HouseholdProfile } from '@/components/gatherKids/household-profile';
import { OnboardingModal } from '@/components/gatherKids/onboarding-modal';
import { useEffect, useState } from 'react';
import { getHouseholdProfile } from '@/lib/dal';
import type { HouseholdProfileData } from '@/lib/dal';

export default function GuardianHouseholdPage() {
	const { user } = useAuth();
	const [profileData, setProfileData] = useState<HouseholdProfileData | null>(
		null
	);
	const [showOnboarding, setShowOnboarding] = useState(false);

	useEffect(() => {
		const load = async () => {
			if (!user?.metadata?.household_id) return;
			const data = await getHouseholdProfile(user.metadata.household_id);
			setProfileData(data);
		};
		load();
	}, [user]);

	useEffect(() => {
		// Check if this is a first-time user who hasn't dismissed onboarding
		if (user && !user.metadata?.onboarding_dismissed) {
			// For demo purposes, show onboarding for the demo parent on first visit
			if (user.uid === 'user_parent_demo') {
				setShowOnboarding(true);
			}
		}
	}, [user]);

	if (!profileData) return <div>Loading household...</div>;

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
