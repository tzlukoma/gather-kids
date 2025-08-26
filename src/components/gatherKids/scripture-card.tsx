'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import React from 'react';

interface ScriptureCardProps {
	assignment: any;
	index: number;
	onToggleAction: (id: string, next: boolean) => void;
}

export default function ScriptureCard({
	assignment,
	index,
	onToggleAction,
}: ScriptureCardProps) {
	const completed = assignment.status === 'completed';
	const reference = assignment.scripture?.reference ?? assignment.scriptureId;
	const verseHtml = assignment.verseText ?? assignment.scripture?.text ?? '';
	const seq = `#${index + 1}`;
	const translation = assignment.scripture?.version ?? 'KJV';

	return (
		<Card className="w-full rounded-lg shadow-sm bg-white border border-gray-200">
			<CardHeader
				className={`${
					completed ? 'bg-green-50' : 'bg-white'
				} flex-row justify-between gap-3 px-4 py-3`}>
				<div className="flex-1 min-w-0 flex flex-col justify-center">
					<CardTitle className="text-xl font-semibold truncate">
						{reference}
					</CardTitle>
					<div className="mt-2 flex flex-wrap gap-2">
						<span className="bg-background border px-2 py-0.5 rounded-full text-xs text-muted-foreground">
							{seq}
						</span>
						<span className="bg-background border px-2 py-0.5 rounded-full text-xs text-muted-foreground">
							{translation}
						</span>
					</div>
				</div>

				<div className="flex-shrink-0">
					<button
						type="button"
						aria-pressed={completed}
						aria-label={completed ? 'Mark not completed' : 'Mark completed'}
						onClick={() => onToggleAction(assignment.id, !completed)}
						className={`inline-flex items-center justify-center h-10 w-10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
							completed
								? 'bg-green-600 text-white shadow'
								: 'border border-gray-300 text-gray-600 bg-white'
						}`}>
						<Check
							className={`h-5 w-5 ${
								completed ? 'text-white' : 'text-gray-600'
							}`}
						/>
					</button>
				</div>
			</CardHeader>

			<CardContent className="px-4 pb-4 pt-3">
				<div
					className="prose max-w-none text-sm"
					dangerouslySetInnerHTML={{ __html: verseHtml }}
				/>
			</CardContent>
		</Card>
	);
}
