'use client';

import { useRouter } from 'next/navigation';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMinistries } from '@/lib/dal';
import { dbAdapter } from '@/lib/db-utils';
import { format } from 'date-fns';
import { ChevronRight, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { useState, useEffect } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { useHouseholdList } from '@/lib/hooks/useData';
import type { Household, Child, Ministry } from '@/lib/types';

export default function RegistrationsPage() {
	const router = useRouter();
	const { user } = useAuth();
	const [ministryFilter, setMinistryFilter] = useState<string | null>(null);

	// State management for data loading
	const [allMinistries, setAllMinistries] = useState<Ministry[]>([]);

	// For ministry leaders, find which ministry their email is associated with
	const [leaderMinistryId, setLeaderMinistryId] = useState<string | null>(null);
	const [noMinistryAssigned, setNoMinistryAssigned] = useState(false);

	// Load ministries data
	useEffect(() => {
		const loadMinistries = async () => {
			try {
				const ministriesData = await getMinistries();
				setAllMinistries(ministriesData);
			} catch (error) {
				console.error('Error loading ministries:', error);
			}
		};

		loadMinistries();
	}, []);

	// Determine ministry filter IDs for React Query
	const [ministryFilterIds, setMinistryFilterIds] = useState<
		string[] | undefined
	>(undefined);

	// Load data using DAL functions
	useEffect(() => {
		const loadData = async () => {
			try {
				// For ministry leaders, find their associated ministry
				let filterIds: string[] | undefined = undefined;
				if (user?.metadata?.role === AuthRole.MINISTRY_LEADER && user.email) {
					console.log(
						'🔍 RegistrationsPage: Finding ministry for leader email',
						user.email
					);

					// Get all ministry accounts to find which ministry this email belongs to
					const ministryAccounts = await dbAdapter.listMinistryAccounts();
					console.log(
						'🔍 RegistrationsPage: All ministry accounts',
						ministryAccounts.map((acc) => ({
							email: acc.email,
							ministry_id: acc.ministry_id,
							display_name: acc.display_name,
						}))
					);
					console.log('🔍 RegistrationsPage: Looking for email', user.email);
					const matchingAccount = ministryAccounts.find(
						(account) =>
							account.email.toLowerCase() === user.email.toLowerCase()
					);

					if (matchingAccount) {
						console.log(
							'🔍 RegistrationsPage: Found matching ministry account',
							{
								ministryId: matchingAccount.ministry_id,
								displayName: matchingAccount.display_name,
							}
						);
						filterIds = [matchingAccount.ministry_id];
						setLeaderMinistryId(matchingAccount.ministry_id);
						console.log(
							'🔍 RegistrationsPage: Set ministryFilterIds to',
							filterIds
						);
					} else {
						console.warn(
							'⚠️ RegistrationsPage: No ministry account found for leader email',
							user.email
						);
						setNoMinistryAssigned(true);
						console.log(
							'🔍 RegistrationsPage: ministryFilterIds remains',
							filterIds
						);
					}
				}

				setMinistryFilterIds(filterIds);
			} catch (error) {
				console.error('Error loading registrations data:', error);
			}
		};

		loadData();
	}, [user]);

	// Use React Query hook for household list
	const { data: households = [], isLoading: loading } = useHouseholdList(
		ministryFilterIds,
		ministryFilter ?? undefined
	);

	const handleRowClick = (householdId: string) => {
		router.push(`/dashboard/registrations/${householdId}`);
	};

	if (loading) {
		return <div>Loading registrations...</div>;
	}

	console.log('🔍 RegistrationsPage: State check before empty state', {
		userRole: user?.metadata?.role,
		userEmail: user?.email,
		noMinistryAssigned,
		loading,
	});

	// Show empty state for ministry leaders without assigned ministry
	if (user?.metadata?.role === AuthRole.MINISTRY_LEADER && noMinistryAssigned) {
		console.log('🔍 RegistrationsPage: Showing empty state', {
			userRole: user?.metadata?.role,
			userEmail: user?.email,
			noMinistryAssigned,
		});
		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
				<div className="text-center space-y-2">
					<h2 className="text-2xl font-semibold">No Ministry Assigned</h2>
					<p className="text-muted-foreground max-w-md">
						Your email address ({user.email}) is not currently associated with
						any active ministry. Please contact your administrator to assign you
						to a ministry.
					</p>
				</div>
				<Button variant="outline" onClick={() => window.location.reload()}>
					Refresh Page
				</Button>
			</div>
		);
	}

	const ministryOptions =
		allMinistries?.map((m) => ({ value: m.ministry_id, label: m.name })) || [];

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-bold font-headline">Registrations</h1>
				<p className="text-muted-foreground">
					A list of all households that have completed the registration process.
				</p>
			</div>
			<Card>
				<CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<CardTitle className="font-headline">
							Registered Households
						</CardTitle>
						<CardDescription>
							Click on a household to view their full profile.
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Filter className="h-4 w-4 text-muted-foreground" />
						<Combobox
							options={ministryOptions}
							value={ministryFilter}
							onChange={setMinistryFilter}
							placeholder="Filter by ministry..."
							clearable={true}
						/>
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Household Name</TableHead>
								<TableHead>Registration Date</TableHead>
								<TableHead>Children</TableHead>
								<TableHead className="w-[50px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{households.map((household) => (
								<TableRow
									key={household.household_id}
									onClick={() => handleRowClick(household.household_id)}
									className="cursor-pointer">
									<TableCell className="font-medium">
										{household.name}
									</TableCell>
									<TableCell>
										{format(new Date(household.created_at), 'PPP')}
									</TableCell>
									<TableCell>
										{household.children
											.map((c) => `${c.first_name} (${c.age})`)
											.join(', ')}
									</TableCell>
									<TableCell>
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
									</TableCell>
								</TableRow>
							))}
							{households.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={4}
										className="text-center h-24 text-muted-foreground">
										No households match the current filter.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
