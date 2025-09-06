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
import { User, Camera, Cake } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { EnrichedChild } from './check-in-view';

interface ChildIdCardProps {
	child: EnrichedChild | null;
	onUpdatePhoto?: (child: any) => void;
	onViewPhoto?: (photo: { name: string; url: string } | null) => void;
	bibleBeeStats?: {
		requiredScriptures: number;
		completedScriptures: number;
		percentDone: number;
		bonus: number;
	} | null;
	essaySummary?: {
		count: number;
		submitted: number;
		pending: number;
	} | null;
}

export function ChildIdCard({
	child,
	onUpdatePhoto,
	onViewPhoto,
	bibleBeeStats,
	essaySummary,
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
						</div>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
					<div className="text-sm text-muted-foreground">
						<div className="font-semibold">Guardians</div>
						{child.guardians?.length ? (
							<ul className="list-disc pl-5">
								{child.guardians.map((g) => (
									<li key={g.guardian_id} className="text-sm">
										{g.first_name} {g.last_name} ({g.relationship})
									</li>
								))}
							</ul>
						) : (
							<div className="text-sm text-muted-foreground">
								No guardian info available.
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{bibleBeeStats ? (
				<div className="mt-3">
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
