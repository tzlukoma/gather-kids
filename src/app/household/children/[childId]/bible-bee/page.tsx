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
import { Checkbox } from '@/components/ui/checkbox';

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
				<h2 className="font-semibold">Scriptures</h2>
				<div className="grid gap-2">
					{data.scriptures.map((s: any) => (
						<Card key={s.id}>
							<CardHeader>
								<CardTitle>{s.scripture?.reference ?? s.scriptureId}</CardTitle>
								<CardDescription>{s.scripture?.text}</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-4">
									<Checkbox
										checked={s.status === 'completed'}
										onCheckedChange={(v) =>
											toggleMutation.mutate({ id: s.id, complete: !!v })
										}
									/>
									<div className="text-sm text-muted-foreground">
										{s.status === 'completed'
											? `Completed ${
													s.completedAt
														? new Date(s.completedAt).toLocaleString()
														: ''
											  }`
											: 'Not completed'}
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>

			<div>
				<h2 className="font-semibold">Essays</h2>
				<div className="space-y-2">
					{data.essays.map((e: any) => (
						<Card key={e.id}>
							<CardHeader>
								<CardTitle>Essay for {e.year?.year}</CardTitle>
								<CardDescription>{e.promptText}</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-4">
									<div className="text-sm text-muted-foreground">
										Status: {e.status}
									</div>
									{e.status !== 'submitted' && (
										<Button
											onClick={() =>
												essayMutation.mutate({
													competitionYearId: e.competitionYearId,
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
