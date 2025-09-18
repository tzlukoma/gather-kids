'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';

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

	const denom = requiredScriptures || totalScriptures || 1;
	const progressPct = denom === 0 ? 0 : (completedScriptures / denom) * 100;

	// Determine the appropriate link path
	const href =
		linkPath ||
		(userRole === AuthRole.GUARDIAN
			? `/household/children/${childId}/bible-bee`
			: `/dashboard/bible-bee/child/${childId}`);

	return (
		<div className="p-3 border rounded-md flex items-center justify-between">
			<div className="flex-1">
				<div className="font-medium">
					<Link href={href} className="text-primary hover:underline">
						{childName}
					</Link>
				</div>

				<div className="text-sm text-muted-foreground mt-1">
					{(totalScriptures || 0) > 0 || (requiredScriptures || 0) > 0
						? 'Scriptures'
						: 'Essay'}
				</div>

				<div className="text-xs text-muted-foreground mt-1">
					Division: {gradeGroup || 'N/A'} • Ministries:{' '}
					{ministries.map((m: any) => m.ministryName).join(', ')}
				</div>

				{showGuardianInfo && primaryGuardian && (
					<div className="text-sm text-muted-foreground mt-1">
						Guardian: {primaryGuardian.first_name} {primaryGuardian.last_name} •{' '}
						{primaryGuardian.mobile_phone || 'no phone'}
					</div>
				)}

				{showGuardianInfo && !primaryGuardian && (
					<div className="text-sm text-muted-foreground mt-1">
						No guardian info
					</div>
				)}
			</div>

			<div className="text-sm text-muted-foreground">
				{(totalScriptures || 0) > 0 || (requiredScriptures || 0) > 0 ? (
					<span
						className={`px-2 py-1 rounded text-xs ${
							progressPct === 0
								? 'bg-gray-100 text-gray-800'
								: progressPct === 100
								? 'bg-green-100 text-green-800'
								: 'bg-yellow-100 text-yellow-800'
						}`}>
						{completedScriptures}/{totalScriptures || requiredScriptures} |{' '}
						{Math.round(progressPct)}%
					</span>
				) : (
					<span
						className={`px-2 py-1 rounded text-xs ${
							essayStatus === 'submitted'
								? 'bg-green-100 text-green-800'
								: essayStatus === 'assigned'
								? 'bg-yellow-100 text-yellow-800'
								: 'bg-gray-100 text-gray-800'
						}`}>
						{essayStatus === 'submitted'
							? 'Submitted'
							: essayStatus === 'assigned'
							? 'Assigned'
							: 'Not Started'}
					</span>
				)}
			</div>
		</div>
	);
}
