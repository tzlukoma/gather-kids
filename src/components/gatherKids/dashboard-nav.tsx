'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
	SidebarProvider,
	Sidebar,
	SidebarHeader,
	SidebarContent,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarTrigger,
} from '@/components/ui/sidebar';
import { getLeaderAssignmentsForCycle } from '@/lib/dal';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MENU_ITEMS } from '@/lib/navigation';
import { useAuth } from '@/contexts/auth-context';
import { LogOut } from 'lucide-react';
import Image from 'next/image';
import { AuthRole } from '@/lib/auth-types';
import { isDemo } from '@/lib/authGuards';

interface DashboardNavProps {
	children: React.ReactNode;
}

export function DashboardNav({ children }: DashboardNavProps) {
	const pathname = usePathname();
	const router = useRouter();
	const { user, userRole, logout } = useAuth();

	// Small helper to safely render icons stored as either a component or node
	function renderIcon(
		Icon: React.ComponentType<{ className?: string }> | React.ReactNode
	) {
		if (typeof Icon === 'function') {
			const C = Icon as React.ComponentType<{ className?: string }>;
			return <C className="w-4 h-4" />;
		}
		return Icon;
	}

	// Helper to extract user id from possible shapes
	function getUserId(u: unknown): string | undefined {
		const obj = u as unknown as Record<string, unknown> | null;
		const uid = obj && (obj.uid as string | undefined | null);
		const id = obj && (obj.id as string | undefined | null);
		const user_id = obj && (obj.user_id as string | undefined | null);
		return uid ?? id ?? user_id ?? undefined;
	}

	const handleLogout = async () => {
		// Handle Supabase logout if not in demo mode
		if (!isDemo()) {
			try {
				const { supabase } = await import('@/lib/supabaseClient');
				await supabase.auth.signOut();
			} catch (error) {
				console.error('Error signing out from Supabase:', error);
			}
		}

		// Always call the context logout to clear local state
		logout();
		router.replace('/login');
	};

	const [assignmentsFromDb, setAssignmentsFromDb] = React.useState<
		string[] | null
	>(null);

	// Load leader assignments from DB if user is a leader and assignedMinistryIds is empty
	React.useEffect(() => {
		let mounted = true;
		const load = async () => {
			if (!user || !userRole) return;
			if (userRole === undefined) return;
			// If user already has assignedMinistryIds, no need to fetch
			if (user.assignedMinistryIds && user.assignedMinistryIds.length > 0)
				return;
			if (userRole === AuthRole.MINISTRY_LEADER) {
				try {
					const leaderId = getUserId(user) as string | undefined;
					if (!leaderId) return;
					const dbAssignments = await getLeaderAssignmentsForCycle(
						leaderId,
						'2025'
					);
					if (!mounted) return;
					setAssignmentsFromDb(dbAssignments.map((a) => a.ministry_id));
				} catch (e) {
					console.error('Failed to load leader assignments from DB', e);
				}
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, [user, userRole]);

	// Determine if the current user is an inactive ministry leader
	const isInactiveLeader =
		userRole === AuthRole.MINISTRY_LEADER && user && !user.is_active;

	// Filter menu items based on user role and ministry assignments
	const filteredMenuItems = MENU_ITEMS.filter((item) => {
		if (!user || !userRole) {
			console.log('DashboardNav - No user or role:', { user, userRole });
			return false;
		}
		console.log('DashboardNav - Checking role access:', {
			userRole,
			itemRoles: item.roles,
			hasAccess: item.roles.includes(userRole),
			assignedMinistryIds: user.assignedMinistryIds,
			assignmentsFromDb,
		});

		if (!item.roles.includes(userRole)) return false;

		// prefer assignedMinistryIds on user, fall back to assignmentsFromDb
		const ministryIds =
			user.assignedMinistryIds && user.assignedMinistryIds.length > 0
				? user.assignedMinistryIds
				: assignmentsFromDb ?? [];

		if (item.ministryCheck) {
			// navigation.ts uses a single-argument ministryCheck(ids) signature
			return item.ministryCheck(ministryIds as string[]);
		}
		return true;
	});

	// If the user is a ministry leader and inactive, restrict nav to Incidents only
	const finalMenuItems = isInactiveLeader
		? MENU_ITEMS.filter((item) => item.href === '/dashboard/incidents')
		: filteredMenuItems;

	return (
		<SidebarProvider>
			<div className="flex min-h-screen">
				{/* Left sidebar with navigation */}
				<Sidebar className="border-r">
					<SidebarHeader>
						<Link href="/" className="flex items-center gap-2">
							<Image
								src="/logos/gatherKids.png"
								alt="gatherKids Logo"
								width={32}
								height={32}
							/>
							<span className="font-bold">gatherKids</span>
						</Link>
						<SidebarTrigger />
					</SidebarHeader>
					<SidebarContent>
						<SidebarMenu>
							{finalMenuItems.map((item) => {
								const Icon = item.icon as
									| React.ComponentType<any>
									| React.ReactNode;
								return (
									<SidebarMenuItem
										key={item.href}
										data-active={pathname === item.href}>
										<SidebarMenuButton asChild>
											<Link
												href={item.href}
												className="flex items-center gap-2">
												{renderIcon(Icon)}
												<span>{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarContent>
					{/* User menu in sidebar footer */}
					<div className="mt-auto border-t p-4">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="flex items-center gap-2 w-full">
									<Image
										src="/avatars/default-avatar.png"
										alt="User Avatar"
										width={24}
										height={24}
										className="rounded-full"
									/>
									<span className="truncate">{user?.email}</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								<DropdownMenuLabel>My Account</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleLogout}>
									<LogOut className="w-4 h-4 mr-2" />
									<span>Sign out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</Sidebar>

				{/* Main content area */}
				<main className="flex-1 overflow-y-auto">
					<div className="container py-6">
						{/* Alert moved to the Incidents page; do not show it in the nav */}
						{children}
					</div>
				</main>
			</div>
		</SidebarProvider>
	);
}
