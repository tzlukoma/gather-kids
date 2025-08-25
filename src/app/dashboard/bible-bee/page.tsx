'use client';
import React from 'react';
import Link from 'next/link';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createCompetitionYear } from '@/lib/bibleBee';
import { db } from '@/lib/db';

export default function BibleBeeAdminPage() {
	const [years, setYears] = React.useState<any[]>([]);

	React.useEffect(() => {
		let mounted = true;
		db.competitionYears.toArray().then((y) => {
			if (mounted) setYears(y.sort((a, b) => b.year - a.year));
		});
		return () => {
			mounted = false;
		};
	}, []);

	async function handleCreate() {
		const y = await createCompetitionYear({
			year: new Date().getFullYear(),
			name: `Year ${new Date().getFullYear()}`,
		});
		setYears((prev) => [y, ...prev]);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Bible Bee Admin</h2>
				<Button onClick={handleCreate}>Create Current Year</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{years.map((y) => (
					<Card key={y.id}>
						<CardHeader>
							<CardTitle>{y.name ?? y.year}</CardTitle>
						</CardHeader>
						<CardContent>
							<div>{y.description}</div>
							<div className="text-sm text-muted-foreground">
								{y.opensAt ? `Opens: ${y.opensAt}` : ''}
							</div>
						</CardContent>
						<CardFooter>
							<Link
								href={`/dashboard/bible-bee/year/${y.id}`}
								className="text-primary underline">
								Manage
							</Link>
						</CardFooter>
					</Card>
				))}
			</div>
		</div>
	);
}
