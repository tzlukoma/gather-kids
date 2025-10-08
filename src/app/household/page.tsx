'use client';

import { useAuth } from '@/contexts/auth-context';
import { HouseholdProfile } from '@/components/gatherKids/household-profile';
import { OnboardingModal } from '@/components/gatherKids/onboarding-modal';
import AuthDebug from '@/components/AuthDebug';
import { useEffect, useState } from 'react';
import { useHouseholdProfile } from '@/lib/hooks/useData';
import { getHouseholdForUser } from '@/lib/dal';
import type { HouseholdProfileData } from '@/lib/dal';

export default function GuardianHouseholdPage() {
	console.log('🔍 HouseholdPage: Component rendering...');
	const { user } = useAuth();
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [householdId, setHouseholdId] = useState<string | null>(null);

	console.log('🔍 HouseholdPage: User state:', {
		hasUser: !!user,
		userId: user?.uid,
		userEmail: user?.email,
	});

	// Use React Query hook for household profile data
	const {
		data: profileData,
		isLoading,
		error,
	} = useHouseholdProfile(householdId || '');

	// Debug React Query state
	useEffect(() => {
		if (householdId) {
			console.log('🔍 HouseholdPage: React Query state:', {
				householdId,
				isLoading,
				hasData: !!profileData,
				hasError: !!error,
				errorMessage: error?.message,
			});
		}
	}, [householdId, isLoading, profileData, error]);

	useEffect(() => {
		const load = async () => {
			if (!user) {
				console.log('🔍 HouseholdPage: No user, skipping load');
				return;
			}

			console.log(
				'🔍 HouseholdPage: Starting household load for user:',
				user.uid
			);

			// First try to get household_id from user metadata
			let targetHouseholdId = user.metadata?.household_id ?? undefined;
			console.log(
				'🔍 HouseholdPage: household_id from metadata:',
				targetHouseholdId
			);

			// If not available, try to find it using user_households table
			if (!targetHouseholdId && user?.uid) {
				console.log(
					'🔍 HouseholdPage: No household_id in metadata, calling getHouseholdForUser...'
				);
				try {
					targetHouseholdId =
						(await getHouseholdForUser(user.uid)) ?? undefined;
					console.log(
						'🔍 HouseholdPage: getHouseholdForUser result:',
						targetHouseholdId
					);
				} catch (error) {
					console.error(
						'🔍 HouseholdPage: Error calling getHouseholdForUser:',
						error
					);
				}
			}

			if (!targetHouseholdId) {
				console.log(
					'🔍 HouseholdPage: No household_id found, redirecting to register'
				);
				// Redirect to register if no household found
				window.location.href = '/register';
				return;
			}

			console.log(
				'🔍 HouseholdPage: Setting householdId to:',
				targetHouseholdId
			);
			setHouseholdId(targetHouseholdId);
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

	if (isLoading || !profileData) return <div>Loading household...</div>;

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
