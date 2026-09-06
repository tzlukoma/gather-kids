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
import { isOfflineSupabase } from '@/lib/offline-supabase';

export default function GuardianHouseholdPage() {
	const { user } = useAuth();
	const router = useRouter();
	const [householdId, setHouseholdId] = useState<string | null>(null);
	const onboardingUserId =
		user && !user.metadata?.onboarding_dismissed && user.uid === 'user_parent_demo'
			? user.uid
			: '';
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [prevOnboardingUserId, setPrevOnboardingUserId] = useState('');

	if (onboardingUserId !== prevOnboardingUserId) {
		setPrevOnboardingUserId(onboardingUserId);
		if (!onboardingUserId) {
			setShowOnboarding(false);
		} else {
			const alreadyShown =
				typeof sessionStorage !== 'undefined' &&
				!!sessionStorage.getItem(`onboarding_shown_${onboardingUserId}`);
			setShowOnboarding(!alreadyShown);
		}
	}

	useEffect(() => {
		if (!onboardingUserId || !showOnboarding) {
			return;
		}
		sessionStorage.setItem(`onboarding_shown_${onboardingUserId}`, 'true');
	}, [onboardingUserId, showOnboarding]);

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

			<OnboardingModal
				isOpen={showOnboarding}
				onClose={() => setShowOnboarding(false)}
			/>
		</div>
	);
}
