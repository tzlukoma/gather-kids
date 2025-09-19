'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getBibleBeeProgressForCycle, getBibleBeeCycles } from '@/lib/dal';
import { Trophy, BookOpen } from 'lucide-react';
import { BibleBeeProgressCard } from './bible-bee-progress-card';
import type { HouseholdProfileData } from '@/lib/dal';

interface ParentBibleBeeViewProps {
	householdId: string;
	children: HouseholdProfileData['children'];
}

export function ParentBibleBeeView({
	householdId,
	children,
}: ParentBibleBeeViewProps) {
	const [progressData, setProgressData] = useState<any[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [bibleBeeCycles, setBibleBeeCycles] = useState<any[]>([]);
	const [selectedCycle, setSelectedCycle] = useState<string>('');

	// Create a stable reference for child IDs to avoid unnecessary re-renders
	const childIds = useMemo(
		() => children.map((child) => child.child_id),
		[children]
	);

	// Load Bible Bee cycles and determine active cycle
	useEffect(() => {
		const loadCycles = async () => {
			try {
				console.log('Loading Bible Bee cycles...');
				const cycles = await getBibleBeeCycles();
				console.log('Loaded cycles:', cycles);
				setBibleBeeCycles(cycles);

				// Find active cycle or use most recent
				const activeCycle = cycles.find((c: any) => c.is_active);
				if (activeCycle) {
					console.log('Found active cycle:', activeCycle.id);
					setSelectedCycle(activeCycle.id);
				} else if (cycles.length > 0) {
					// Use most recent cycle if no active one
					const sortedCycles = [...cycles].sort((a: any, b: any) => {
						if (a.created_at && b.created_at) {
							return (
								new Date(b.created_at).getTime() -
								new Date(a.created_at).getTime()
							);
						}
						return 0;
					});
					console.log('Using most recent cycle:', sortedCycles[0].id);
					setSelectedCycle(sortedCycles[0].id);
				} else {
					console.log('No cycles found');
				}
			} catch (error) {
				console.error('Failed to load Bible Bee cycles:', error);
			}
		};

		loadCycles();
	}, []);

	useEffect(() => {
		const loadProgress = async () => {
			console.log('Progress effect triggered:', {
				selectedCycle,
				householdId,
				childIds,
			});
			if (!selectedCycle) {
				console.log('No selected cycle, skipping progress load');
				return;
			}

			try {
				setLoading(true);
				console.log('Loading Bible Bee progress for cycle:', selectedCycle);

				// Get Bible Bee progress for the selected cycle
				const allProgress = await getBibleBeeProgressForCycle(selectedCycle);
				console.log('All progress data:', allProgress);

				// Filter to only this household's children
				console.log('Household child IDs:', childIds);

				const householdProgress = allProgress.filter((progress: any) =>
					childIds.includes(progress.childId)
				);
				console.log('Filtered household progress:', householdProgress);

				setProgressData(householdProgress);
			} catch (error) {
				console.error('Failed to load Bible Bee progress:', error);
				setProgressData([]);
			} finally {
				setLoading(false);
			}
		};

		loadProgress();
	}, [selectedCycle, householdId, childIds]);

	if (loading) {
		console.log('Rendering loading state:', {
			loading,
			selectedCycle,
			progressData,
		});
		return <div>Loading Bible Bee progress...</div>;
	}

	if (!progressData || progressData.length === 0) {
		return (
			<div className="text-center py-8">
				<BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
				<p className="text-muted-foreground">
					No Bible Bee progress data found for your children.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2 mb-6">
				<Trophy className="h-6 w-6 text-primary" />
				<h2 className="text-2xl font-bold">Bible Bee Progress</h2>
			</div>

			<div className="text-sm text-muted-foreground mb-4">
				Click on any card below to view detailed progress and assignments for
				that child.
			</div>

			<div className="space-y-2">
				{progressData.map((child: any) => (
					<BibleBeeProgressCard
						key={child.childId}
						childId={child.childId}
						childName={child.childName}
						completedScriptures={child.completedScriptures}
						totalScriptures={child.totalScriptures}
						requiredScriptures={child.requiredScriptures}
						essayStatus={child.essayStatus}
						gradeGroup={child.gradeGroup}
						ministries={child.ministries}
						primaryGuardian={child.primaryGuardian}
						showGuardianInfo={false} // Hide guardian info in household view since it's the current user's children
						linkPath={`/household/children/${child.childId}/bible-bee`}
					/>
				))}
			</div>
		</div>
	);
}
