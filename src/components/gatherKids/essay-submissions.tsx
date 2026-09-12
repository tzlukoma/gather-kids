'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import EssayCard from '@/components/gatherKids/essay-card';

interface EssaySubmission {
	id: string;
	status: 'submitted' | 'assigned' | 'not_started';
	bible_bee_cycle_id: string;
	essayPrompt?: {
		title?: string;
		prompt?: string;
		instructions?: string;
		due_date?: string;
	};
}

interface EssaySubmissionsProps {
	essays: EssaySubmission[];
	onSubmitEssay?: (bibleBeeCycleId: string) => void;
}

export function EssaySubmissions({
	essays,
}: EssaySubmissionsProps) {
	if (!essays || essays.length === 0) {
		return null;
	}

	return (
		<div className="mt-6">
			<h3 className="font-medium text-lg mb-3">Your Submissions</h3>
			<div className="space-y-2">
				{essays.map((e) => (
					<EssayCard
						key={e.id}
						essayPrompt={{
							title: e.essayPrompt?.title || 'Essay Assignment',
							prompt: e.essayPrompt?.prompt,
							instructions: e.essayPrompt?.instructions,
							due_date: e.essayPrompt?.due_date,
						}}>
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
					</EssayCard>
				))}
			</div>
		</div>
	);
}
