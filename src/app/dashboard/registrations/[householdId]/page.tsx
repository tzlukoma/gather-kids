'use client';

import { useParams, useRouter } from 'next/navigation';
import { HouseholdProfile } from '@/components/gatherKids/household-profile';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { useHouseholdProfile } from '@/hooks/data';

export default function HouseholdProfilePage() {
	const params = useParams();
	const router = useRouter();
	const { user, loading } = useAuth();
	const [isAuthorized, setIsAuthorized] = useState(false);

	const householdId = params.householdId as string;

	// Use React Query hook for household profile data
	const { data: profileData, isLoading } = useHouseholdProfile(householdId);

	useEffect(() => {
		if (!loading && user) {
			// This page is accessible to both admins and leaders.
			// Further logic could be added to check if a leader has access to THIS specific household.
			// For now, if they can see the list, they can see the profile.
			setIsAuthorized(true);
		}
	}, [user, loading, router]);

	if (loading || !isAuthorized || isLoading || !profileData) {
		return <div>Loading household profile...</div>;
	}

	if (!profileData.household) {
		return <div>Household not found.</div>;
	}

	return <HouseholdProfile profileData={profileData} />;
}
