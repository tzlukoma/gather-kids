'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { getLeaderAssignmentsForCycle } from '@/lib/dal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/select';
import LeaderBibleBeeProgress from '@/components/gatherKids/bible-bee-progress';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import Link from 'next/link';

function AuthLoader({ user, setAllowed, setSelectedLeader }: any) {
	useEffect(() => {
		let mounted = true;
		const load = async () => {
			if (!user) return;

			const uid = user.id || user.user_id || user.uid || user.userId;

			if (user?.metadata?.role === AuthRole.ADMIN) {
				setAllowed(true);
				setSelectedLeader((prev: any) => prev || null);
				return;
			}

			if (user?.metadata?.role === AuthRole.MINISTRY_LEADER && uid) {
				const assignments = await getLeaderAssignmentsForCycle(uid, '2025');
				const includes = assignments.some(
					(a: any) => a.ministry_id === 'bible-bee'
				);
				if (includes) {
					setAllowed(true);
					setSelectedLeader(uid);
				}
			}
		};

		load();
		return () => {
			mounted = false;
		};
	}, [user, setAllowed, setSelectedLeader]);

	return null;
}

export default function BibleBeePage() {
	const { user, loading } = useAuth();
	const [allowed, setAllowed] = useState(false);
	const [leaders, setLeaders] = useState<{ id: string; name: string }[]>([]);
	const [selectedLeader, setSelectedLeader] = useState<string | null>(null);
	const [selectedCycle, setSelectedCycle] = useState<string>('2025');
	const competitionYears = useLiveQuery(
		() => db.competitionYears.orderBy('year').reverse().toArray(),
		[]
	);

	useEffect(() => {
		let mounted = true;
		const loadLeaders = async () => {
			if (user?.metadata?.role === AuthRole.ADMIN) {
				const allLeaders = await db.users
					.where('metadata/role')
					.equals('MINISTRY_LEADER')
					.toArray();
				if (!mounted) return;
				const list = allLeaders.map((u: any) => ({
					id: u.id || u.user_id || u.uid || u.userId,
					name: u.name || u.displayName || u.email,
				}));
				setLeaders(list);
				setSelectedLeader((prev) => prev || (list[0]?.id ?? null));
			}
		};
		loadLeaders();
		return () => {
			mounted = false;
		};
	}, [user]);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold font-headline">Bible Bee Progress</h1>
				<p className="text-muted-foreground">
					Progress by leader and grade group.
				</p>
			</div>

			{user?.metadata?.role === AuthRole.ADMIN && (
				<>
					<Card>
						<CardHeader>
							<CardTitle>Select Leader</CardTitle>
							<CardDescription>
								Choose a leader to view their Bible Bee progress.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="w-72">
								<Select
									onValueChange={(v: any) => setSelectedLeader(String(v))}>
									<SelectTrigger>
										<SelectValue>
											{selectedLeader || 'Select a leader'}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{leaders.map((l) => (
											<SelectItem key={l.id} value={l.id}>
												{l.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Bible Bee Years</CardTitle>
							<CardDescription>
								Manage competition years and scriptures.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<YearList />
						</CardContent>
					</Card>
				</>
			)}

			{selectedLeader ? (
				<Card>
					<CardHeader>
						<CardTitle>Leader View</CardTitle>
						<CardDescription>
							Read-only progress for children assigned to this leader's
							ministries.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<LeaderBibleBeeProgress
							leaderId={selectedLeader}
							cycleId={selectedCycle}
						/>
					</CardContent>
				</Card>
			) : (
				<div>No leader selected.</div>
			)}

			{!loading && user && (
				<AuthLoader
					user={user}
					setAllowed={setAllowed}
					setSelectedLeader={setSelectedLeader}
				/>
			)}
		</div>
	);
}

function YearList() {
	const years = useLiveQuery(
		() => db.competitionYears.orderBy('year').reverse().toArray(),
		[]
	);
	if (!years) return <div>Loading years...</div>;
	if (years.length === 0) return <div>No competition years defined.</div>;
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			{years.map((y: any) => (
				<Card key={y.id}>
					<CardHeader>
						<CardTitle>{y.name ?? y.year}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm text-muted-foreground">{y.description}</div>
						<div className="mt-2">
							<Link
								href={`/dashboard/bible-bee/year/${y.id}`}
								className="text-primary underline">
								Manage
							</Link>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
