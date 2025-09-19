'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
	getHouseholdProfile,
	getBibleBeeMinistry,
	getHouseholdForUser,
} from '@/lib/dal';
import { ParentBibleBeeView } from '@/components/gatherKids/parent-bible-bee-view';
import { BookOpen, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { isOnOrAfterInET, formatDateInET } from '@/lib/utils/timezone';
import type { Ministry } from '@/lib/types';

export default function HouseholdBibleBeePage() {
	const { user } = useAuth();
	const [profileData, setProfileData] = useState<any>(null);
	const [bibleBeeMinistry, setBibleBeeMinistry] = useState<Ministry | null>(
		null
	);
	const [isBeforeOpenDate, setIsBeforeOpenDate] = useState<boolean>(false);
	const [openDateFormatted, setOpenDateFormatted] = useState<string>('');

	// Load Bible Bee ministry and check open date
	useEffect(() => {
		const loadMinistry = async () => {
			try {
				const ministry = await getBibleBeeMinistry();
				setBibleBeeMinistry(ministry);

				if (ministry?.open_at) {
					const now = new Date();
					const beforeOpen = !isOnOrAfterInET(now, ministry.open_at);
					setIsBeforeOpenDate(beforeOpen);
					setOpenDateFormatted(formatDateInET(ministry.open_at));
				} else {
					// If no open date, show cards and log warning
					setIsBeforeOpenDate(false);
					if (ministry) {
						console.warn('Bible Bee ministry open date not configured');
					}
				}
			} catch (error) {
				console.error('Failed to load Bible Bee ministry:', error);
				// Default to showing cards if error occurs
				setIsBeforeOpenDate(false);
			}
		};

		loadMinistry();
	}, []);

	useEffect(() => {
		const load = async () => {
			console.log('Bible Bee page: Starting profile load, user:', user);
			if (!user) return;

			// First try to get household_id from user metadata
			let targetHouseholdId = user.metadata?.household_id ?? undefined;

			// If not available, try to find it using user_households table
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
			try {
				const data = await getHouseholdProfile(targetHouseholdId);
				console.log('Bible Bee page: Profile loaded successfully:', data);
				setProfileData(data);
			} catch (error) {
				console.error('Bible Bee page: Failed to load profile:', error);
			}
		};
		load();
	}, [user]);

	if (!profileData) {
		console.log('Bible Bee page: profileData not loaded yet');
		return <div>Loading Bible Bee progress...</div>;
	}

	// Check for enrolled children in this household
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
			<div className="text-center py-8">
				<BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
				<p className="text-muted-foreground">
					No children in this household are enrolled in the Bible Bee.
				</p>
			</div>
		);
	}

	// If before open date, show message instead of cards
	if (isBeforeOpenDate) {
		console.log('Bible Bee page: Before open date, showing message');
		return (
			<div className="flex flex-col gap-6">
				<div>
					<h1 className="text-3xl font-bold font-headline">Bible Bee</h1>
					<p className="text-muted-foreground">
						View progress and resources for your children enrolled in the Bible
						Bee.
					</p>
				</div>

				<Card className="text-center py-12">
					<CardContent className="flex flex-col items-center gap-4">
						<Calendar className="h-16 w-16 text-muted-foreground" />
						<div>
							<h2 className="text-xl font-semibold mb-2">
								Bible Bee Opening Soon
							</h2>
							<p className="text-muted-foreground text-lg">
								The Bible Bee will begin on {openDateFormatted}.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Show the parent Bible Bee view with household children
	console.log(
		'Bible Bee page: Rendering ParentBibleBeeView with',
		enrolledChildren.length,
		'children'
	);
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold font-headline">Bible Bee</h1>
				<p className="text-muted-foreground">
					Progress and resources for your children enrolled in the Bible Bee.
				</p>
			</div>

			<ParentBibleBeeView
				householdId={user?.metadata?.household_id || ''}
				children={enrolledChildren}
			/>
		</div>
	);
}
