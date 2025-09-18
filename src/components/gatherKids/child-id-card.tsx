'use client';

import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Camera, Cake } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { EnrichedChild } from './check-in-view';

// Helper function to convert grade numbers to readable labels
function getGradeLabel(grade: number): string {
	if (grade === 0) return 'Kindergarten';
	if (grade === 1) return '1st Grade';
	if (grade === 2) return '2nd Grade';
	if (grade === 3) return '3rd Grade';

	// Handle grades 4-12 with proper ordinal formatting
	if (grade >= 4 && grade <= 12) {
		const lastDigit = grade % 10;
		const lastTwoDigits = grade % 100;

		// Special cases for 11th, 12th, 13th (though 13th won't occur in grades)
		if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
			return `${grade}th Grade`;
		}

		// Regular ordinal rules
		if (lastDigit === 1) return `${grade}st Grade`;
		if (lastDigit === 2) return `${grade}nd Grade`;
		if (lastDigit === 3) return `${grade}rd Grade`;
		return `${grade}th Grade`;
	}

	return `Grade ${grade}`;
}

interface ChildIdCardProps {
	child: EnrichedChild | null;
	onUpdatePhoto?: (child: any) => void;
	onViewPhoto?: (photo: { name: string; url: string } | null) => void;
	bibleBeeStats?: {
		requiredScriptures: number;
		completedScriptures: number;
		percentDone: number;
		bonus: number;
		division?: {
			name: string;
			min_grade: number;
			max_grade: number;
		};
		essayAssigned?: boolean;
	} | null;
	essaySummary?: {
		count: number;
		submitted: number;
		pending: number;
	} | null;
	isComputingStats?: boolean;
}

export function ChildIdCard({
	child,
	onUpdatePhoto,
	onViewPhoto,
	bibleBeeStats,
	essaySummary,
	isComputingStats = false,
}: ChildIdCardProps) {
	if (!child) return <div>Loading child...</div>;

	const isBirthday = (() => {
		try {
			if (!child.dob) return false;
			const today = new Date();
			const b = parseISO(child.dob);
			const thisYear = new Date(today.getFullYear(), b.getMonth(), b.getDate());
			const diff = Math.abs(
				(thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
			);
			return diff <= 7;
		} catch (e) {
			return false;
		}
	})();

	return (
		<>
			<Card className="relative flex flex-col overflow-hidden">
				{isBirthday && (
					<div className="bg-brand-orange text-white text-center py-1 px-2 text-sm font-semibold flex items-center justify-center gap-2">
						<Cake className="h-4 w-4" />
						Birthday This Week!
					</div>
				)}
				<CardHeader className="flex flex-col items-center gap-4 p-4 pt-6 text-center sm:flex-row sm:items-start sm:p-6 sm:text-left">
					<div className="relative w-24 h-24 sm:w-[60px] sm:h-[60px] flex-shrink-0">
						<Button
							variant="ghost"
							className="w-full h-full p-0 rounded-full"
							onClick={() =>
								child.photo_url &&
								onViewPhoto?.({
									name: `${child.first_name} ${child.last_name}`,
									url: child.photo_url,
								})
							}>
							<Avatar className="w-full h-full border-2 border-border hover:border-primary transition-colors">
								<AvatarImage src={child.photo_url} alt={child.first_name} />
								<AvatarFallback>
									<User className="h-12 w-12 sm:h-8 sm:w-8 text-muted-foreground" />
								</AvatarFallback>
							</Avatar>
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background"
							onClick={() => onUpdatePhoto?.(child)}>
							<Camera className="h-4 w-4" />
						</Button>
					</div>
					<div className="flex-1">
						<CardTitle className="font-headline text-lg">{`${child.first_name} ${child.last_name}`}</CardTitle>
						<CardDescription>{child.household?.name || '...'}</CardDescription>
						<div className="flex flex-wrap gap-1 mt-2">
							<div className="text-sm text-muted-foreground">
								DOB:{' '}
								{child.dob ? format(parseISO(child.dob), 'MMM d, yyyy') : 'N/A'}
							</div>
							<div className="text-sm text-muted-foreground">
								Grade: {child.grade || 'N/A'}
							</div>
							<div className="text-sm text-muted-foreground">
								Age: {child.age ?? 'N/A'}
							</div>
							{bibleBeeStats?.division && (
								<div className="text-sm text-muted-foreground">
									Division: {bibleBeeStats.division.name} -{' '}
									{getGradeLabel(bibleBeeStats.division.min_grade)} to{' '}
									{getGradeLabel(bibleBeeStats.division.max_grade)}
								</div>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
					<div className="text-sm text-muted-foreground">
						<div className="font-semibold">Guardian:</div>
						{child.guardians?.length ? (
							(() => {
								// Filter for primary guardian only
								const primaryGuardian = child.guardians.find(
									(g) => g.is_primary
								);
								if (primaryGuardian) {
									return (
										<div className="text-sm">
											{primaryGuardian.first_name} {primaryGuardian.last_name} (
											{primaryGuardian.relationship})
										</div>
									);
								} else {
									// Fallback to first guardian if no primary is marked
									const firstGuardian = child.guardians[0];
									return (
										<div className="text-sm">
											{firstGuardian.first_name} {firstGuardian.last_name} (
											{firstGuardian.relationship})
										</div>
									);
								}
							})()
						) : (
							<div className="text-sm text-muted-foreground">
								No guardian info available.
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{bibleBeeStats || isComputingStats ? (
				<div className="mt-3">
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{isComputingStats ? (
							// Loading skeleton
							<>
								<div className="p-3 bg-background border rounded text-center">
									<div className="text-xs text-muted-foreground">Target</div>
									<Skeleton className="h-6 w-8 mx-auto mt-1" />
								</div>
								<div className="p-3 bg-background border rounded text-center">
									<div className="text-xs text-muted-foreground">Completed</div>
									<Skeleton className="h-6 w-8 mx-auto mt-1" />
								</div>
								<div className="p-3 bg-background border rounded text-center">
									<div className="text-xs text-muted-foreground">% Done</div>
									<Skeleton className="h-6 w-12 mx-auto mt-1" />
								</div>
								<div className="p-3 bg-background border rounded text-center">
									<div className="text-xs text-muted-foreground">Bonus</div>
									<Skeleton className="h-6 w-8 mx-auto mt-1" />
								</div>
							</>
						) : (
							// Actual metrics
							<>
								<div className="p-3 bg-background border rounded text-center">
									<div className="text-xs text-muted-foreground">Target</div>
									<div className="font-semibold text-lg">
										{bibleBeeStats!.requiredScriptures}
									</div>
								</div>
								<div className="p-3 bg-background border rounded text-center">
									<div className="text-xs text-muted-foreground">Completed</div>
									<div className="font-semibold text-lg">
										{bibleBeeStats!.completedScriptures}
									</div>
								</div>
								<div className="p-3 bg-background border rounded text-center">
									<div className="text-xs text-muted-foreground">% Done</div>
									<div className="font-semibold text-lg">
										{Math.round(bibleBeeStats!.percentDone)}%
									</div>
								</div>
								<div className="p-3 bg-background border rounded text-center">
									<div className="text-xs text-muted-foreground">Bonus</div>
									<div className="font-semibold text-lg">
										{bibleBeeStats!.bonus}
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			) : essaySummary ? (
				<div className="mt-3">
					<div className="grid grid-cols-3 gap-2">
						<div className="p-3 bg-background border rounded text-center">
							<div className="text-xs text-muted-foreground">Essays</div>
							<div className="font-semibold text-lg">{essaySummary.count}</div>
						</div>
						<div className="p-3 bg-background border rounded text-center">
							<div className="text-xs text-muted-foreground">Submitted</div>
							<div className="font-semibold text-lg">
								{essaySummary.submitted}
							</div>
						</div>
						<div className="p-3 bg-background border rounded text-center">
							<div className="text-xs text-muted-foreground">Pending</div>
							<div className="font-semibold text-lg">
								{essaySummary.pending}
							</div>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}

export default ChildIdCard;
