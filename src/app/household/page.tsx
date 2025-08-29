'use client';

import { useAuth } from '@/contexts/auth-context';
import { HouseholdProfile } from '@/components/gatherKids/household-profile';
import { OnboardingModal } from '@/components/gatherKids/onboarding-modal';
import { useEffect, useState } from 'react';
import { getHouseholdProfile } from '@/lib/dal';
import type { HouseholdProfileData } from '@/lib/dal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParentBibleBeeView } from '@/components/gatherKids/parent-bible-bee-view';

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

	// Check if any child is enrolled in Bible Bee
	const hasAnyBibleBeeEnrollment = profileData.children.some(child => 
		Object.values(child.enrollmentsByCycle).some(enrollments =>
			enrollments.some(enrollment => enrollment.ministry_id === 'bible-bee')
		)
	);

	return (
		<div>
			<Tabs defaultValue="household" className="w-full">
				<TabsList className={`grid w-full ${hasAnyBibleBeeEnrollment ? 'grid-cols-2' : 'grid-cols-1'}`}>
					<TabsTrigger value="household">Household</TabsTrigger>
					{hasAnyBibleBeeEnrollment && (
						<TabsTrigger value="bible-bee">Bible Bee</TabsTrigger>
					)}
				</TabsList>
				<TabsContent value="household">
					<HouseholdProfile profileData={profileData} />
				</TabsContent>
				{hasAnyBibleBeeEnrollment && (
					<TabsContent value="bible-bee">
						<ParentBibleBeeView 
							householdId={user?.metadata?.household_id || ''} 
							children={profileData.children}
						/>
					</TabsContent>
				)}
			</Tabs>
			
			<OnboardingModal 
				isOpen={showOnboarding} 
				onClose={() => setShowOnboarding(false)} 
			/>
		</div>
	);
}
