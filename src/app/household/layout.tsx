'use client';

import React, { useEffect, useState } from 'react';
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
	SidebarFooter,
	SidebarTrigger,
	SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Home, Book, User, LogOut, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ROLES } from '@/lib/constants/roles';
import { GuardianSkeleton } from '@/components/skeletons/guardian-skeleton';
import { getHouseholdProfile, getHouseholdForUser } from '@/lib/dal';
import type { HouseholdProfileData } from '@/lib/dal';
import { SettingsModal } from '@/components/settings/settings-modal';

function HouseholdLayoutContent({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const { user, logout } = useAuth();
	const [hasBibleBeeEnrollment, setHasBibleBeeEnrollment] = useState(false);
	const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

	useEffect(() => {
		const checkBibleBeeEnrollment = async () => {
			if (!user) return;

			// Try to get household_id from user metadata first
			let targetHouseholdId: string | undefined;
			try {
				const uid = user?.uid;
				if (!uid) throw new Error('no user');
				const got = await getHouseholdForUser(uid);
				// getHouseholdForUser may return null from DB mapping; coerce to undefined for callers expecting string | undefined
				targetHouseholdId = got ?? undefined;
			} catch (err) {
				// no-op
			}

			// If not available, try to find it using user_households table
			if (!targetHouseholdId && user?.uid) {
				const { getHouseholdForUser } = await import('@/lib/dal');
				targetHouseholdId = (await getHouseholdForUser(user.uid)) ?? undefined;
			}

			if (!targetHouseholdId) return;

			try {
				const profileData = await getHouseholdProfile(targetHouseholdId);
				const hasEnrollment = profileData.children.some((child) =>
					Object.values(child.enrollmentsByCycle).some((enrollments) =>
						enrollments.some(
							(enrollment) => enrollment.ministry_id === 'bible-bee'
						)
					)
				);
				setHasBibleBeeEnrollment(hasEnrollment);
			} catch (error) {
				console.error('Failed to check Bible Bee enrollment:', error);
			}
		};

		checkBibleBeeEnrollment();
	}, [user]);

	const handleLogout = () => {
		logout();
		router.push('/');
	};

	const menuItems = [
		{
			label: 'Our Household',
			href: '/household',
			icon: Home,
		},
		...(hasBibleBeeEnrollment
			? [
					{
						label: 'Bible Bee',
						href: '/household/bible-bee',
						icon: Book,
					},
			  ]
			: []),
	];

	if (!user) return null;

	return (
		<SidebarProvider>
			<div className="flex flex-col min-h-screen">
				<header className="flex items-center justify-between p-4 border-b bg-background z-20 h-16">
					<div className="flex items-center gap-4">
						<SidebarTrigger className="md:hidden" />
						<Link
							href="/household"
							className="flex items-center gap-2 text-foreground">
							<div className="font-headline text-2xl font-bold">gatherKids</div>
						</Link>
					</div>
					<div className="flex items-center gap-4">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="relative h-10 w-10 rounded-full">
									<Avatar className="h-10 w-10">
										<AvatarImage src={undefined} alt={user.name ?? ''} />
										<AvatarFallback>
											<User className="h-5 w-5" />
										</AvatarFallback>
									</Avatar>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-56" align="end" forceMount>
								<DropdownMenuLabel className="font-normal">
									<div className="flex flex-col space-y-1">
										<p className="text-sm font-medium leading-none">
											{user.name}
										</p>
										<p className="text-xs leading-none text-muted-foreground">
											{user.email}
										</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={() => setIsSettingsModalOpen(true)}>
									<Settings className="mr-2" />
									<span>Settings</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={handleLogout}>
									<LogOut className="mr-2" />
									<span>Sign Out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</header>
				<div className="flex flex-1">
					<Sidebar>
						<SidebarContent>
							<SidebarHeader className="p-0">
								<div className="flex items-center justify-between p-2">
									<div />
									<SidebarTrigger className="hidden md:flex" />
								</div>
							</SidebarHeader>
							<SidebarMenu>
								{menuItems.map((item: any) => (
									<SidebarMenuItem key={item.href}>
										<Link href={item.href} passHref>
											<SidebarMenuButton
												tooltip={item.label}
												isActive={
													pathname === item.href ||
													(item.href === '/household/bible-bee' &&
														pathname.startsWith('/household/bible-bee'))
												}>
												{React.createElement(item.icon as any, {
													className: 'w-4 h-4',
												})}
												<span>{item.label}</span>
											</SidebarMenuButton>
										</Link>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarContent>
						<SidebarFooter>
							{/* Footer content can go here if needed in the future */}
						</SidebarFooter>
					</Sidebar>
					<SidebarInset>
						<main className="p-4 md:p-6 lg:p-8">{children}</main>
					</SidebarInset>
				</div>
			</div>
			<SettingsModal
				isOpen={isSettingsModalOpen}
				onClose={() => setIsSettingsModalOpen(false)}
			/>
		</SidebarProvider>
	);
}

function HouseholdProtectedRoute({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	const [hasHouseholdAccess, setHasHouseholdAccess] = useState<boolean | null>(
		null
	);
	const router = useRouter();

	useEffect(() => {
		const checkHouseholdAccess = async () => {
			if (loading) return;

			if (!user) {
				router.push('/login');
				return;
			}

			// Check if user has GUARDIAN role OR has household data
			if (user.metadata?.role === ROLES.GUARDIAN) {
				setHasHouseholdAccess(true);
				return;
			}

			// Check if user has household data via user_households table
			if (user.uid) {
				try {
					const householdId = await getHouseholdForUser(user.uid);
					if (householdId) {
						setHasHouseholdAccess(true);
						return;
					}
				} catch (error) {
					console.warn('Could not check household access:', error);
				}
			}

			// No household access found
			setHasHouseholdAccess(false);
			router.push('/register'); // Redirect to registration if no household found
		};

		checkHouseholdAccess();
	}, [user, loading, router]);

	if (loading || hasHouseholdAccess === null) {
		return <GuardianSkeleton />;
	}

	if (!hasHouseholdAccess) {
		return null; // Will redirect
	}

	return <>{children}</>;
}

interface GuardianLayoutProps {
	children: React.ReactNode;
}

export default function GuardianLayout({ children }: GuardianLayoutProps) {
	return (
		<HouseholdProtectedRoute>
			<HouseholdLayoutContent>{children}</HouseholdLayoutContent>
		</HouseholdProtectedRoute>
	);
}
