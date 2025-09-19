'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getHouseholdProfile, getBibleBeeMinistry } from '@/lib/dal';
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
			if (!user?.metadata?.household_id) return;
			const data = await getHouseholdProfile(user.metadata.household_id);
			setProfileData(data);
		};
		load();
	}, [user]);

	if (!profileData) return <div>Loading Bible Bee progress...</div>;

	// Check for enrolled children in this household
	const enrolledChildren = profileData.children.filter((child: any) =>
		Object.values(child.enrollmentsByCycle).some((enrollments: any) =>
			enrollments.some(
				(enrollment: any) => enrollment.ministry_code === 'bible-bee'
			)
		)
	);

	if (enrolledChildren.length === 0) {
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
