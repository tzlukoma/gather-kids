'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getHouseholdForUser } from '@/lib/dal';
import { useHouseholdProfile } from '@/hooks/data';
import { BibleBeeHouseholdGatherSystem } from '@/components/gatherKids/bible-bee-household-gathersystem';
import { BookOpen } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export function BibleBeeHouseholdContentGatherSystem() {
	const { user } = useAuth();
	const [householdId, setHouseholdId] = useState<string | null>(null);

	const { data: profileData, isLoading } = useHouseholdProfile(householdId || '');

	useEffect(() => {
		const load = async () => {
			console.log('Bible Bee page: Starting profile load, user:', user);
			if (!user) return;

			let targetHouseholdId = user.metadata?.household_id ?? undefined;

			if (!targetHouseholdId && user?.uid) {
				console.log(
					'Bible Bee page: No household_id in metadata, checking user_households table'
				);
				targetHouseholdId = (await getHouseholdForUser(user.uid)) ?? undefined;
			}

			if (!targetHouseholdId) {
				console.log('Bible Bee page: No household_id found for user');
				return;
			}

			console.log(
				'Bible Bee page: Loading profile for household_id:',
				targetHouseholdId
			);
			setHouseholdId(targetHouseholdId);
		};
		load();
	}, [user]);

	if (isLoading || !profileData) {
		console.log('Bible Bee page: profileData not loaded yet');
		return <div>Loading Bible Bee progress...</div>;
	}

	const enrolledChildren = profileData.children.filter((child: any) =>
		Object.values(child.enrollmentsByCycle).some((enrollments: any) =>
			enrollments.some(
				(enrollment: any) => enrollment.ministry_code === 'bible-bee'
			)
		)
	);

	console.log(
		'Bible Bee page: enrolledChildren count:',
		enrolledChildren.length
	);
	console.log('Bible Bee page: profileData.children:', profileData.children);

	if (enrolledChildren.length === 0) {
		console.log('Bible Bee page: No enrolled children found');
		return (
			<EmptyState
				className="py-8"
				icon={BookOpen}
				title="No Bible Bee enrollments"
				description="No children in this household are enrolled in the Bible Bee."
			/>
		);
	}

	return (
		<BibleBeeHouseholdGatherSystem
			householdId={householdId || ''}
			childrenData={enrolledChildren}
		/>
	);
}
