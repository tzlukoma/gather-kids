'use client';

import { useParams } from 'next/navigation';
import {
	useStudentAssignmentsQuery,
	useToggleScriptureMutation,
	useSubmitEssayMutation,
} from '@/lib/hooks/useBibleBee';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import ScriptureCard from '@/components/gatherKids/scripture-card';

export default function ChildBibleBeePage() {
	const params = useParams();
	const childId = params.childId as string;

	const { data, isLoading } = useStudentAssignmentsQuery(childId);
	const toggleMutation = useToggleScriptureMutation(childId);
	const essayMutation = useSubmitEssayMutation(childId);

	if (isLoading || !data) return <div>Loading Bible Bee assignments...</div>;

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-headline">Bible Bee Assignments</h1>

			<div>
				<h2 className="font-semibold text-2xl">Scriptures</h2>
				<div className="grid gap-2">
					{data.scriptures.map((s: any, idx: number) => (
						<ScriptureCard
							key={s.id}
							assignment={s}
							index={idx}
							onToggleAction={(id, next) =>
								toggleMutation.mutate({ id, complete: next })
							}
						/>
					))}
				</div>
			</div>

			<div>
				<h2 className="font-semibold">Essays</h2>
				<div className="space-y-2">
					{data.essays.map((e: any) => (
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
								<div className="flex items-center gap-4">
									<span
										className={`px-2 py-1 rounded text-xs ${
											e.status === 'submitted'
												? 'bg-green-100 text-green-800'
												: e.status === 'assigned'
												? 'bg-yellow-100 text-yellow-800'
												: 'bg-gray-100 text-gray-800'
										}`}>
										{e.status === 'submitted'
											? 'Submitted'
											: e.status === 'assigned'
											? 'Assigned'
											: 'Not Started'}
									</span>
									{e.status !== 'submitted' && (
										<Button
											onClick={() =>
												essayMutation.mutate({
													bibleBeeCycleId: e.bible_bee_cycle_id,
												})
											}
											size="sm">
											Mark Submitted
										</Button>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
