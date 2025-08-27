'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { queryLeaders } from '@/lib/dal';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

export default function LeadersDashboard() {
	const [leaders, setLeaders] = useState<any[]>([]);

	useEffect(() => {
		const load = async () => {
			const data = await queryLeaders();
			setLeaders(data);
		};
		load();
	}, []);

	const activeCount = leaders.filter((l) => l.is_active).length;

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-bold font-headline">Leader Dashboard</h1>
				<p className="text-muted-foreground">
					Overview of leader activity and assignments.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="font-headline">Total Leaders</CardTitle>
						<CardDescription>Number of leaders in the system</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{leaders.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="font-headline">Active Leaders</CardTitle>
						<CardDescription>
							Leaders currently active and assigned
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{activeCount}</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="font-headline">All Leaders</CardTitle>
					<CardDescription>
						Click a row to open the leader profile.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Assignments</TableHead>
								<TableHead className="w-[50px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{leaders.map((leader) => (
								<TableRow key={leader.user_id} className="cursor-pointer">
									<TableCell className="font-medium">{leader.name}</TableCell>
									<TableCell>
										<Badge variant={leader.is_active ? 'default' : 'secondary'}>
											{leader.is_active ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
									<TableCell>
										{leader.assignments.length > 0 ? (
											<span className="text-sm text-muted-foreground">
												{leader.assignments
													.map((a: any) => a.ministryName)
													.join(', ')}
											</span>
										) : (
											<span className="text-sm text-muted-foreground">
												No assignments
											</span>
										)}
									</TableCell>
									<TableCell>
										<Link href={`/dashboard/leaders/${leader.user_id}`}>
											<ChevronRight className="h-4 w-4 text-muted-foreground" />
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
