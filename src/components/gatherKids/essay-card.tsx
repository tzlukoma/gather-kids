'use client';

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { EssayPrompt } from '@/lib/types';

interface EssayCardProps {
	essayPrompt: EssayPrompt;
}

export default function EssayCard({ essayPrompt }: EssayCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{essayPrompt.title || 'Essay Assignment'}</CardTitle>
				<CardDescription>Essay prompt for this division</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div>
						<h4 className="font-medium mb-2">Prompt:</h4>
						<p className="text-sm text-muted-foreground leading-relaxed">
							{essayPrompt.prompt}
						</p>
					</div>
					{essayPrompt.instructions && (
						<div>
							<h4 className="font-medium mb-2">Instructions:</h4>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{essayPrompt.instructions}
							</p>
						</div>
					)}
					{essayPrompt.due_date && (
						<div>
							<h4 className="font-medium mb-1">Due Date:</h4>
							<p className="text-sm text-muted-foreground">
								{(() => {
									// Parse the date string and create a local date
									const dateStr = essayPrompt.due_date;
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

										return localDate.toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'long',
											day: 'numeric',
										});
									} else {
										// Fallback for non-ISO dates
										return new Date(dateStr).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'long',
											day: 'numeric',
										});
									}
								})()}
							</p>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
