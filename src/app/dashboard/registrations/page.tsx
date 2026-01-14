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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ChevronRight, Filter, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import React, { useState, useEffect, useMemo } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { useHouseholdList } from '@/hooks/data';
import { useMinistries } from '@/hooks/data/ministries';
import type { Household, Child, Ministry } from '@/lib/types';

export default function RegistrationsPage() {
	const router = useRouter();
	const { user } = useAuth();
	const [ministryFilter, setMinistryFilter] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState<string>('');

	// React Query hooks for data fetching
	const {
		data: allMinistries = [],
		isLoading: ministriesLoading,
		error: ministriesError,
	} = useMinistries();

	// For ministry leaders, find which ministry their email is associated with
	const [leaderMinistryId, setLeaderMinistryId] = useState<string | null>(null);
	const [noMinistryAssigned, setNoMinistryAssigned] = useState(false);

	// Determine ministry filter IDs for React Query
	const [ministryFilterIds, setMinistryFilterIds] = useState<
		string[] | undefined
	>(undefined);

	// Load data using DAL functions
	useEffect(() => {
		const loadData = async () => {
			try {
				// For ministry leaders, use their assigned ministry IDs
				let filterIds: string[] | undefined = undefined;
				
				// Check if user is a ministry leader
				if (user?.metadata?.role === AuthRole.MINISTRY_LEADER) {
					if (user.assignedMinistryIds && user.assignedMinistryIds.length > 0) {
						console.log(
							'🔍 RegistrationsPage: Using assigned ministry IDs for leader',
							user.assignedMinistryIds
						);

						filterIds = user.assignedMinistryIds;
						setLeaderMinistryId(user.assignedMinistryIds[0]); // Use first ministry ID for display
						setNoMinistryAssigned(false);
						console.log(
							'🔍 RegistrationsPage: Set ministryFilterIds to',
							filterIds
						);
					} else {
						// Ministry leader but no assigned ministries yet
						// This could mean the async check is still running, or they truly have no access
						console.warn(
							'⚠️ RegistrationsPage: Ministry leader has no assigned ministries yet',
							user.email,
							'This might be temporary if the ministry check is still running'
						);
						// Don't set noMinistryAssigned immediately - wait a bit for the check to complete
						// The filterIds will remain undefined, which means show all (but this is the issue)
						// For now, we'll show the warning but not block access
						setNoMinistryAssigned(false); // Don't show error immediately
					}
				}

				setMinistryFilterIds(filterIds);
			} catch (error) {
				console.error('Error loading registrations data:', error);
			}
		};

		loadData();
	}, [user, user?.assignedMinistryIds]); // Also depend on assignedMinistryIds to react when it's populated

	// Use React Query hook for household list with children data
	const { data: households = [], isLoading: householdsLoading } =
		useHouseholdList(ministryFilterIds, ministryFilter || undefined);

	// Client-side filtering using useMemo for optimal performance
	const filteredHouseholds = useMemo(() => {
		if (!households) return [];

		let filtered = [...households];

		// Filter by combined search term (household name or child name)
		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			filtered = filtered.filter((h) => {
				// Check household name
				if (h.name?.toLowerCase().includes(term)) return true;

				// Check if any child matches
				return (h.children || []).some(
					(c) =>
						`${c.first_name} ${c.last_name}`.toLowerCase().includes(term) ||
						c.first_name.toLowerCase().includes(term) ||
						c.last_name.toLowerCase().includes(term)
				);
			});
		}

		return filtered;
	}, [households, searchTerm]);

	// Helper function to highlight matching children
	const highlightMatchingChild = (child: Child & { age: number | null }) => {
		const childName = `${child.first_name} (${child.age})`;
		if (!searchTerm.trim()) return childName;

		const term = searchTerm.toLowerCase();
		const fullName = `${child.first_name} ${child.last_name}`.toLowerCase();
		const isMatch =
			fullName.includes(term) ||
			child.first_name.toLowerCase().includes(term) ||
			child.last_name.toLowerCase().includes(term);

		return isMatch ? (
			<span className="font-semibold text-primary">{childName}</span>
		) : (
			childName
		);
	};

	const handleRowClick = (householdId: string) => {
		router.push(`/dashboard/registrations/${householdId}`);
	};

	const loading = ministriesLoading || householdsLoading;

	if (loading) {
		return <div>Loading registrations...</div>;
	}

	if (ministriesError) {
		console.error('Error loading ministries:', ministriesError);
		return <div>Error loading ministries. Please try again.</div>;
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
				<CardHeader className="flex flex-col gap-4">
					<div>
						<CardTitle className="font-headline">
							Registered Households
						</CardTitle>
						<CardDescription>
							Click on a household to view their full profile.
						</CardDescription>
					</div>

					{/* Search and Filter Controls */}
					<div className="flex flex-col gap-3">
						<div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center sm:justify-end">
							{/* Combined search input */}
							<div className="relative w-full sm:w-1/3 max-w-md">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									type="text"
									placeholder="Search by household or child name..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-9"
								/>
							</div>

							{/* Ministry filter dropdown */}
							<div className="flex items-center gap-2 w-full sm:w-auto">
								<Filter className="h-4 w-4 text-muted-foreground" />
								<Combobox
									options={ministryOptions}
									value={ministryFilter}
									onChange={setMinistryFilter}
									placeholder="Filter by ministry..."
									clearable={true}
								/>
							</div>
						</div>

						{/* Filter Pills */}
						{(searchTerm || ministryFilter) && (
							<div className="flex flex-wrap gap-2 items-center">
								<span className="text-sm text-muted-foreground">
									Active filters:
								</span>
								{searchTerm && (
									<Badge variant="secondary" className="gap-1">
										Search: {searchTerm}
										<X
											className="h-3 w-3 cursor-pointer hover:text-destructive"
											onClick={() => setSearchTerm('')}
										/>
									</Badge>
								)}
								{ministryFilter && (
									<Badge variant="secondary" className="gap-1">
										Ministry:{' '}
										{
											ministryOptions.find((m) => m.value === ministryFilter)
												?.label
										}
										<X
											className="h-3 w-3 cursor-pointer hover:text-destructive"
											onClick={() => setMinistryFilter(null)}
										/>
									</Badge>
								)}
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setSearchTerm('');
										setMinistryFilter(null);
									}}
									className="h-6 text-xs">
									Clear all
								</Button>
							</div>
						)}
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
							{filteredHouseholds.map((household) => (
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
										{(household.children || []).map((c, idx) => (
											<React.Fragment key={c.child_id}>
												{idx > 0 && ', '}
												{highlightMatchingChild(c)}
											</React.Fragment>
										))}
									</TableCell>
									<TableCell>
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
									</TableCell>
								</TableRow>
							))}
							{filteredHouseholds.length === 0 && (
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
