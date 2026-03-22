'use client';

import { useParams } from 'next/navigation';
import { HouseholdProfile } from '@/components/gatherKids/household-profile';
import { useAuth } from '@/contexts/auth-context';
import { useHouseholdProfile } from '@/hooks/data';

export default function HouseholdProfilePage() {
	const params = useParams();
	const { user, loading } = useAuth();
	// This page is accessible to both admins and leaders.
	// Further logic could be added to check if a leader has access to THIS specific household.
	// For now, any authenticated user can see the profile.
	const isAuthorized = !loading && !!user;

	const householdId = params.householdId as string;

	// Use React Query hook for household profile data
	const { data: profileData, isLoading } = useHouseholdProfile(householdId);

	if (!isAuthorized || isLoading || !profileData) {
		return <div>Loading household profile...</div>;
	}

	if (!profileData.household) {
		return <div>Household not found.</div>;
	}

	return <HouseholdProfile profileData={profileData} />;
}
