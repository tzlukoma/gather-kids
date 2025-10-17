'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ExternalLink, BookOpen, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface BibleBeeProgressCardProps {
	childId: string;
	childName: string;
	completedScriptures: number;
	totalScriptures?: number;
	requiredScriptures?: number;
	essayStatus?: string;
	gradeGroup?: string;
	ministries?: Array<{ ministryName: string }>;
	primaryGuardian?: {
		first_name: string;
		last_name: string;
		mobile_phone?: string;
	};
	showGuardianInfo?: boolean;
	linkPath?: string;
}

export function BibleBeeProgressCard({
	childId,
	childName,
	completedScriptures,
	totalScriptures,
	requiredScriptures,
	essayStatus,
	gradeGroup,
	ministries = [],
	primaryGuardian,
	showGuardianInfo = true,
	linkPath,
}: BibleBeeProgressCardProps) {
	const { userRole } = useAuth();
	const queryClient = useQueryClient();

	// Prefetch child detail data on hover
	const handleMouseEnter = async () => {
		console.log('🖱️ Mouse enter on child:', childId);

		try {
			// Check if data is already cached to avoid unnecessary requests
			const childData = queryClient.getQueryData(['child', childId]);

			console.log('📊 Cache check - childData:', !!childData);

			// Only prefetch if data is not already cached
			if (!childData) {
				console.log('🚀 Starting prefetch for child:', childId);

				// Prefetch child data
				await queryClient.prefetchQuery({
					queryKey: ['child', childId],
					queryFn: async () => {
						console.log('👶 Fetching child data for:', childId);
						const { getChild } = await import('@/lib/dal');
						const result = await getChild(childId);
						console.log('✅ Child data fetched:', result);
						return result;
					},
					staleTime: 5 * 60 * 1000, // 5 minutes
				});

				console.log('✅ Core prefetch completed for child:', childId);
			} else {
				console.log('⚡ Child data already cached for child:', childId);
			}

			// Prefetch household and guardian data after we have child data
			const finalChildData =
				childData || queryClient.getQueryData(['child', childId]);
			if (finalChildData && (finalChildData as any)?.household_id) {
				const householdId = (finalChildData as any).household_id;
				const householdData = queryClient.getQueryData([
					'household',
					householdId,
				]);
				const guardiansData = queryClient.getQueryData([
					'guardians',
					householdId,
				]);

				console.log(
					'🏠 Household prefetch check - householdData:',
					!!householdData,
					'guardiansData:',
					!!guardiansData
				);

				// Only prefetch if data is not already cached
				if (!householdData || !guardiansData) {
					console.log('🏠 Prefetching household data for:', householdId);

					await Promise.all([
						// Prefetch household data
						queryClient.prefetchQuery({
							queryKey: ['household', householdId],
							queryFn: async () => {
								console.log('🏠 Fetching household data for:', householdId);
								const { getHousehold } = await import('@/lib/dal');
								const result = await getHousehold(householdId);
								console.log('✅ Household data fetched:', result);
								return result;
							},
							staleTime: 5 * 60 * 1000, // 5 minutes
						}),
						// Prefetch guardians data
						queryClient.prefetchQuery({
							queryKey: ['guardians', householdId],
							queryFn: async () => {
								console.log('👨‍👩‍👧‍👦 Fetching guardians data for:', householdId);
								const { listGuardians } = await import('@/lib/dal');
								const result = await listGuardians({ householdId });
								console.log('✅ Guardians data fetched:', result);
								return result;
							},
							staleTime: 5 * 60 * 1000, // 5 minutes
						}),
					]);

					console.log('✅ Household prefetch completed for:', householdId);
				} else {
					console.log('⚡ Household data already cached for:', householdId);
				}
			}

			console.log('🎉 All prefetching completed for child:', childId);
		} catch (error) {
			// Silently fail prefetching - don't interrupt user experience
			console.error('❌ Prefetch failed for child:', childId, error);
		}
	};

	const denom = requiredScriptures || 1; // Use requiredScriptures as the denominator (division target)
	const progressPct = denom === 0 ? 0 : (completedScriptures / denom) * 100;

	// Determine the appropriate link path
	const href =
		linkPath ||
		(userRole === AuthRole.GUARDIAN
			? `/household/children/${childId}/bible-bee`
			: `/dashboard/bible-bee/child/${childId}`);

	// Determine if this is essay track vs scripture track
	const isEssayTrack = !!essayStatus;

	return (
		<div className="p-4 border rounded-lg bg-card hover:shadow-md transition-all duration-200 cursor-pointer group">
			<Link href={href} className="block" onMouseEnter={handleMouseEnter}>
				<div className="flex items-start justify-between mb-3">
					<div className="flex-1">
						<div className="font-semibold text-lg flex items-center gap-2 group-hover:text-primary transition-colors">
							{childName}
							<ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
						</div>

						<div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
							{isEssayTrack ? (
								<>
									<FileText className="h-4 w-4" />
									Essay Assignment
								</>
							) : (
								<>
									<BookOpen className="h-4 w-4" />
									Scripture Progress
								</>
							)}
						</div>

						<div className="text-xs text-muted-foreground mt-2">
							Division: {gradeGroup || 'N/A'} • Ministries:{' '}
							{ministries.map((m: any) => m.ministryName).join(', ')}
						</div>

						{showGuardianInfo && primaryGuardian && (
							<div className="text-sm text-muted-foreground mt-2">
								Guardian: {primaryGuardian.first_name}{' '}
								{primaryGuardian.last_name} •{' '}
								{primaryGuardian.mobile_phone || 'no phone'}
							</div>
						)}

						{showGuardianInfo && !primaryGuardian && (
							<div className="text-sm text-muted-foreground mt-2">
								No guardian info
							</div>
						)}
					</div>

					<div className="ml-4">
						{isEssayTrack ? (
							<div className="text-right">
								<Badge
									variant={
										essayStatus === 'submitted'
											? 'default'
											: essayStatus === 'assigned'
											? 'secondary'
											: 'outline'
									}
									className="text-sm px-3 py-1">
									{essayStatus === 'submitted'
										? 'Submitted'
										: essayStatus === 'assigned'
										? 'Assigned'
										: 'Not Started'}
								</Badge>
								<div className="text-xs text-muted-foreground mt-1">
									Essay Status
								</div>
							</div>
						) : (
							<div className="text-right">
								<div className="text-lg font-bold text-primary">
									{Math.round(progressPct)}%
								</div>
								<div className="text-xs text-muted-foreground">
									{completedScriptures}/{requiredScriptures}
								</div>
							</div>
						)}
					</div>
				</div>

				{!isEssayTrack && (
					<div className="mt-3">
						<Progress value={progressPct} className="h-2" />
					</div>
				)}
			</Link>
		</div>
	);
}
