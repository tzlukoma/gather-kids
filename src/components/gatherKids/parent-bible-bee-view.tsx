'use client';

import React, { useEffect, useState } from 'react';
import { getBibleBeeProgressForCycle } from '@/lib/dal';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, BookOpen, FileText, Trophy } from 'lucide-react';
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

	useEffect(() => {
		const loadProgress = async () => {
			try {
				setLoading(true);
				// Get Bible Bee progress for current cycle (2025)
				const allProgress = await getBibleBeeProgressForCycle('2025');

				// Filter to only this household's children
				const householdChildIds = children.map((child) => child.child_id);
				const householdProgress = allProgress.filter((progress: any) =>
					householdChildIds.includes(progress.childId)
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
	}, [householdId, children]);

	if (loading) {
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

			{progressData.map((child: any) => {
				const requiredScriptures = child.requiredScriptures || 0;
				const completedScriptures = child.completedScriptures || 0;
				const progressPercent =
					requiredScriptures > 0
						? Math.round((completedScriptures / requiredScriptures) * 100)
						: 0;

				// Determine if this is essay track vs scripture track
				const isEssayTrack = requiredScriptures === 0 && child.essayStatus;

				return (
					<Card key={child.childId} className="w-full">
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="text-xl">{child.childName}</CardTitle>
									<CardDescription>
										Grade Group: {child.gradeGroup || 'N/A'} • Status:{' '}
										{child.bibleBeeStatus || 'Not Started'}
									</CardDescription>
								</div>
								<Badge
									variant={
										child.bibleBeeStatus === 'Complete'
											? 'default'
											: 'secondary'
									}>
									{isEssayTrack ? 'Essay Track' : 'Scripture Track'}
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{isEssayTrack ? (
								// Essay track display
								<div className="space-y-4">
									<div className="flex items-center gap-3">
										<FileText className="h-5 w-5 text-muted-foreground" />
										<div className="flex-1">
											<p className="font-medium">Essay Assignment</p>
											<p className="text-sm text-muted-foreground">
												Status:{' '}
												<Badge
													variant={
														child.essayStatus === 'submitted'
															? 'default'
															: 'outline'
													}>
													{child.essayStatus || 'Not Started'}
												</Badge>
											</p>
										</div>
									</div>
									{child.essayPrompt && (
										<div className="p-3 bg-muted rounded-lg">
											<p className="text-sm font-medium mb-1">Essay Prompt:</p>
											<p className="text-sm text-muted-foreground">
												{child.essayPrompt}
											</p>
										</div>
									)}
								</div>
							) : (
								// Scripture track display
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<BookOpen className="h-5 w-5 text-muted-foreground" />
											<div>
												<p className="font-medium">Scripture Progress</p>
												<p className="text-sm text-muted-foreground">
													{completedScriptures} of {totalScriptures} completed
												</p>
											</div>
										</div>
										<div className="text-right">
											<p className="text-2xl font-bold">{progressPercent}%</p>
											<p className="text-xs text-muted-foreground">Complete</p>
										</div>
									</div>
									<Progress value={progressPercent} className="h-2" />

									{child.scriptures && child.scriptures.length > 0 && (
										<Collapsible>
											<CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
												<ChevronDown className="h-4 w-4" />
												View Scripture List ({child.scriptures.length}{' '}
												scriptures)
											</CollapsibleTrigger>
											<CollapsibleContent className="mt-3">
												<div className="space-y-2 max-h-60 overflow-y-auto">
													{child.scriptures.map(
														(scripture: any, index: number) => (
															<div
																key={scripture.id}
																className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
																<div>
																	<span className="font-medium">
																		{scripture.reference}
																	</span>
																	{scripture.text && (
																		<p className="text-muted-foreground text-xs mt-1 line-clamp-2">
																			{scripture.text}
																		</p>
																	)}
																</div>
																<Badge
																	variant={
																		scripture.status === 'completed'
																			? 'default'
																			: 'outline'
																	}
																	className="text-xs">
																	{scripture.status === 'completed' ? '✓' : '○'}
																</Badge>
															</div>
														)
													)}
												</div>
											</CollapsibleContent>
										</Collapsible>
									)}
								</div>
							)}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
