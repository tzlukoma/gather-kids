'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

interface EssaySubmission {
	id: string;
	status: 'submitted' | 'assigned' | 'not_started';
	bible_bee_cycle_id: string;
	essayPrompt?: {
		title?: string;
		prompt?: string;
		due_date?: string;
	};
}

interface EssaySubmissionsProps {
	essays: EssaySubmission[];
	onSubmitEssay: (bibleBeeCycleId: string) => void;
}

export function EssaySubmissions({
	essays,
	onSubmitEssay,
}: EssaySubmissionsProps) {
	if (!essays || essays.length === 0) {
		return null;
	}

	return (
		<div className="mt-6">
			<h3 className="font-medium text-lg mb-3">Your Submissions</h3>
			<div className="space-y-2">
				{essays.map((e) => (
					<Card key={e.id}>
						<CardHeader>
							<CardTitle>
								{e.essayPrompt?.title || 'Essay Assignment'}
							</CardTitle>
							<CardDescription>
								{e.essayPrompt?.prompt || 'Essay prompt for this division'}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{e.essayPrompt?.due_date && (
									<div>
										<h4 className="font-medium mb-1">Due Date:</h4>
										<p className="text-sm text-muted-foreground">
											{(() => {
												// Parse the date string and create a local date
												const dateStr = e.essayPrompt.due_date;
												// If it's an ISO string, parse it as local time
												if (dateStr.includes('T')) {
													const [datePart, timePart] = dateStr.split('T');
													const [year, month, day] = datePart.split('-');
													const [time, tz] = timePart.split(/[+-]/);
													const [hours, minutes] = time.split(':');

													// Create date in local timezone
													const localDate = new Date(
														parseInt(year),
														parseInt(month) - 1, // months are 0-indexed
														parseInt(day),
														parseInt(hours),
														parseInt(minutes)
													);

													return (
														localDate.toLocaleDateString('en-US', {
															year: 'numeric',
															month: 'long',
															day: 'numeric',
														}) +
														' at ' +
														localDate.toLocaleTimeString('en-US', {
															hour: 'numeric',
															minute: '2-digit',
															hour12: true,
														})
													);
												} else {
													// Fallback for non-ISO dates
													const fallbackDate = new Date(dateStr);
													return (
														fallbackDate.toLocaleDateString('en-US', {
															year: 'numeric',
															month: 'long',
															day: 'numeric',
														}) +
														' at ' +
														fallbackDate.toLocaleTimeString('en-US', {
															hour: 'numeric',
															minute: '2-digit',
															hour12: true,
														})
													);
												}
											})()}
										</p>
									</div>
								)}
								<div className="flex items-center gap-4">
									<Badge
										variant={
											e.status === 'submitted'
												? 'default'
												: e.status === 'assigned'
												? 'secondary'
												: 'outline'
										}
										className="text-sm px-3 py-1">
										{e.status === 'submitted'
											? 'Submitted'
											: e.status === 'assigned'
											? 'Assigned'
											: 'Not Started'}
									</Badge>
									{e.status !== 'submitted' && (
										<Button
											onClick={() =>
												window.open(
													'https://docs.google.com/forms/d/e/1FAIpQLSe4z-u1Tiyz403ExsRH-tV4tAO0PwI7Min4QPwBLtSrf1lQOA/viewform?usp=header',
													'_blank'
												)
											}
											size="sm"
											variant="outline">
											<ExternalLink className="h-4 w-4 mr-2" />
											Upload Essay
										</Button>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
