'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getBibleBeeProgressForCycle, getBibleBeeCycles } from '@/lib/dal';
import { BookOpen, CheckCircle2, Circle, Award, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import type { HouseholdProfileData } from '@/lib/dal';
import { normalizeGradeDisplay } from '@/lib/gradeUtils';
import Link from 'next/link';

interface BibleBeeHouseholdGatherSystemProps {
	householdId: string;
	childrenData: HouseholdProfileData['children'];
}

export function BibleBeeHouseholdGatherSystem({
	householdId,
	childrenData,
}: BibleBeeHouseholdGatherSystemProps) {
	const [progressData, setProgressData] = useState<any[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [bibleBeeCycles, setBibleBeeCycles] = useState<any[]>([]);
	const [selectedCycle, setSelectedCycle] = useState<string>('');

	const childIds = useMemo(
		() => childrenData.map((child) => child.child_id),
		[childrenData]
	);

	useEffect(() => {
		const loadCycles = async () => {
			try {
				const cycles = await getBibleBeeCycles();
				setBibleBeeCycles(cycles);

				const activeCycle = cycles.find((c: any) => c.is_active);
				if (activeCycle) {
					setSelectedCycle(activeCycle.id);
				} else if (cycles.length > 0) {
					const sortedCycles = [...cycles].sort((a: any, b: any) => {
						if (a.created_at && b.created_at) {
							return (
								new Date(b.created_at).getTime() -
								new Date(a.created_at).getTime()
							);
						}
						return 0;
					});
					setSelectedCycle(sortedCycles[0].id);
				}
			} catch (error) {
				console.error('Failed to load Bible Bee cycles:', error);
			}
		};

		loadCycles();
	}, []);

	useEffect(() => {
		const loadProgress = async () => {
			if (!selectedCycle) {
				return;
			}

			try {
				setLoading(true);

				const allProgress = await getBibleBeeProgressForCycle(selectedCycle);
				const householdProgress = allProgress.filter((progress: any) =>
					childIds.includes(progress.childId)
				);

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
		return (
			<div className="min-h-screen bg-ground">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="animate-pulse">
						<div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
						<div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							<div className="h-48 bg-gray-200 rounded"></div>
							<div className="h-48 bg-gray-200 rounded"></div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Empty state: no children with progress
	if (!progressData || progressData.length === 0) {
		return (
			<div className="min-h-screen bg-ground">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="mb-8">
						<h1 className="text-3xl font-headline font-semibold text-ink mb-2">
							Bible Bee
						</h1>
						<p className="text-muted-foreground">
							Scripture memory and essay tracking for your household
						</p>
					</div>

					<Card className="text-center py-12">
						<CardContent className="flex flex-col items-center gap-4">
							<BookOpen className="h-16 w-16 text-muted-foreground" />
							<div>
								<h2 className="text-xl font-semibold mb-2">
									Nothing Marked Yet
								</h2>
								<p className="text-muted-foreground">
									Your children haven&apos;t started tracking scripture memory yet.
								</p>
								<p className="text-muted-foreground text-sm mt-2">
									Check back after the first week of Bible Bee!
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-ground">
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-headline font-semibold text-ink mb-2">
						Bible Bee Scriptures
					</h1>
					<p className="text-muted-foreground">
						Track your children&apos;s scripture memory and essay progress
					</p>
				</div>

				{/* Children Progress Cards */}
				<div className="space-y-4">
					{progressData.map((child: any) => {
						const child_data = childrenData.find(c => c.child_id === child.childId);
						const progressPercent = child.totalScriptures
							? Math.round(
									(child.completedScriptures / child.totalScriptures) * 100
							  )
							: 0;
						const allMemorized =
							child.totalScriptures > 0 &&
							child.completedScriptures >= child.totalScriptures;
						const hasSeniorEssay =
							child.essayStatus && child.essayStatus !== 'not_applicable';

						return (
							<Card
								key={child.childId}
								className="hover:shadow-md transition-shadow">
								<CardHeader>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4">
											<Avatar className="h-16 w-16">
												<AvatarImage
													src={child_data?.photo_url}
													alt={child.childName}
												/>
												<AvatarFallback>
													<User className="h-8 w-8" />
												</AvatarFallback>
											</Avatar>
											<div>
												<CardTitle className="font-headline text-xl">
													{child.childName}
												</CardTitle>
												<p className="text-sm text-muted-foreground">
													{child_data && normalizeGradeDisplay(child_data.grade)}
													{child.gradeGroup && ` • ${child.gradeGroup}`}
												</p>
											</div>
										</div>
										{allMemorized && (
											<Badge
												variant="default"
												className="bg-teal text-white">
												<Award className="h-4 w-4 mr-1" />
												All Memorized!
											</Badge>
										)}
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									{/* Scripture Progress */}
									<div>
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center gap-2">
												<BookOpen className="h-5 w-5 text-teal" />
												<span className="font-medium">Scripture Memory</span>
											</div>
											<span className="text-sm text-muted-foreground">
												{child.completedScriptures} / {child.totalScriptures}
											</span>
										</div>
										<Progress value={progressPercent} className="h-2" />
										<p className="text-sm text-muted-foreground mt-1">
											{progressPercent}% complete
										</p>
									</div>

									{/* Essay Status (for senior) */}
									{hasSeniorEssay && (
										<div className="border-t pt-4">
											<div className="flex items-center gap-2 mb-2">
												<FileText className="h-5 w-5 text-teal" />
												<span className="font-medium">Senior Essay</span>
											</div>
											<Badge
												variant={
													child.essayStatus === 'completed'
														? 'default'
														: 'secondary'
												}>
												{child.essayStatus === 'completed'
													? 'Completed'
													: child.essayStatus === 'in_progress'
													? 'In Progress'
													: 'Not Started'}
											</Badge>
										</div>
									)}

									{/* Action Button */}
									<Button
										variant="default"
										className="w-full"
										asChild>
										<Link href={`/household/children/${child.childId}/bible-bee`}>
											View Details
										</Link>
									</Button>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</div>
	);
}
