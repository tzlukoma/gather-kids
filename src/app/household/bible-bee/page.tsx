'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getHouseholdProfile } from '@/lib/dal';
import { BibleBeeProgressList } from '@/components/gatherKids/bible-bee-progress-list';
import { BookOpen } from 'lucide-react';

export default function HouseholdBibleBeePage() {
	const { user } = useAuth();
	const [profileData, setProfileData] = useState<any>(null);
	const [childIds, setChildIds] = useState<string[]>([]);

	useEffect(() => {
		const load = async () => {
			if (!user?.metadata?.household_id) return;
			const data = await getHouseholdProfile(user.metadata.household_id);
			setProfileData(data);
			// Get list of child IDs for filtering
			const ids = data.children.map((child: any) => child.child_id);
			setChildIds(ids);
		};
		load();
	}, [user]);

	if (!profileData) return <div>Loading Bible Bee progress...</div>;

	if (childIds.length === 0) {
		return (
			<div className="text-center py-8">
				<BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
				<p className="text-muted-foreground">No children found in your household.</p>
			</div>
		);
	}

	return (
		<BibleBeeProgressList
			filterChildIds={childIds}
			showGuardianInfo={false}
			showFilters={false}
			title="Bible Bee Progress"
			description="Progress and scriptures for your children in the selected year."
			showYearSelection={true}
		/>
	);
}