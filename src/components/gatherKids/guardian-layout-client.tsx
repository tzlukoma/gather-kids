'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { Home, Book, User, Users, HelpCircle, LogOut, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useBranding } from '@/contexts/branding-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AuthRole } from '@/lib/auth-types';
import { GuardianSkeleton } from '@/components/skeletons/guardian-skeleton';
import { getHouseholdProfile, getHouseholdForUser } from '@/lib/dal';
import type { HouseholdProfileData } from '@/lib/dal';
import { SettingsModal } from '@/components/settings/settings-modal';
import { renderNavIcon } from '@/components/ui/nav-icon';
import { isOfflineSupabase } from '@/lib/offline-supabase';
import { GuardianShellProvider } from '@/components/gatherKids/guardian-shell-context';
import {
	buildGuardianNavItems,
	isGuardianNavItemActive,
	type GuardianNavId,
} from '@/lib/guardian-navigation';
import {
	GUARDIAN_TAB_ACTIVE,
	GUARDIAN_TAB_INACTIVE,
	GUARDIAN_TAB_LABEL,
} from '@/components/gatherKids/guardian-styles';

/**
 * Tab-bar glyphs, keyed by nav id so `guardian-navigation.ts` can stay free of
 * JSX and remain testable in this repo's jsdom.
 */
const GUARDIAN_TAB_ICONS: Record<GuardianNavId, typeof Home> = {
	home: Home,
	household: Users,
	'bible-bee': Book,
	help: HelpCircle,
};

function HouseholdLayoutLegacy({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const { user, logout } = useAuth();
	const { settings } = useBranding();
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
					(child.enrollments ?? []).some((enrollment) => {
						return (enrollment as { ministry_code?: string }).ministry_code === 'bible-bee';
					})
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

	const menuItems = useMemo(
		() => [
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
		],
		[hasBibleBeeEnrollment]
	);

	// renderNavIcon is imported from @/components/ui/nav-icon (MAINT-19)

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
							{settings.logo_url ? (
								<>
									{/* PERF-08: next/image for optimized logo loading */}
									<Image
										src={settings.logo_url}
										alt={`${settings.app_name || 'gatherKids'} Logo`}
										width={200}
										height={64}
										className={`h-16 w-auto ${
											settings.use_logo_only ? '' : 'max-w-[50%]'
										} object-contain`}
										priority
									/>
									{!settings.use_logo_only && (
										<div className="font-headline text-2xl font-bold">
											{settings.app_name || 'gatherKids'}
										</div>
									)}
								</>
							) : (
								<div className="font-headline text-2xl font-bold">
									{settings.app_name || 'gatherKids'}
								</div>
							)}
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
												{renderNavIcon(item.icon)}
												<span>{item.label}</span>
											</SidebarMenuButton>
										</Link>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarContent>
						<SidebarFooter className="p-2 flex justify-center">
							<Link
								href="/help"
								className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
								About gatherKids
							</Link>
						</SidebarFooter>
					</Sidebar>
					<SidebarInset>
						<main id="main-content" className="p-4 md:p-6 lg:p-8">{children}</main>
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

			if (isOfflineSupabase()) {
				setHasHouseholdAccess(true);
				return;
			}

			if (user.metadata?.role === AuthRole.GUARDIAN) {
				setHasHouseholdAccess(true);
				return;
			}

			if (user.uid) {
				try {
					const householdId = await getHouseholdForUser(user.uid);
					if (householdId) {
						setHasHouseholdAccess(true);
						return;
					}
				} catch (error) {
					console.error('HouseholdProtectedRoute: getHouseholdForUser failed:', error);
				}
			}

			setHasHouseholdAccess(false);
			setTimeout(() => {
				router.push('/register');
			}, 100);
		};

		checkHouseholdAccess();
	}, [user, loading, router]);

	if (loading || hasHouseholdAccess === null) {
		return <GuardianSkeleton />;
	}

	if (!hasHouseholdAccess) {
		// USE-04: Show a redirecting indicator instead of a blank screen
		return <GuardianSkeleton />;
	}

	return <>{children}</>;
}

/**
 * GatherSystem household chrome — Figma `Screen · Guardian` (#371).
 *
 * A bottom tab bar on a phone and a horizontal top nav from `md` up, replacing
 * the collapsible sidebar. The destinations are the same list the legacy
 * sidebar builds, so nothing a guardian can reach today stops being reachable:
 * `Household` is the household record the sidebar called `Our Household`, now
 * at `/household/details` because Home has taken the section root.
 */
function HouseholdLayoutGatherSystem({
	children,
	hasBibleBeeEnrollment,
	onOpenSettings,
	onLogout,
}: {
	children: React.ReactNode;
	hasBibleBeeEnrollment: boolean;
	onOpenSettings: () => void;
	onLogout: () => void;
}) {
	const pathname = usePathname();
	const { user } = useAuth();
	const { settings } = useBranding();
	const navItems = buildGuardianNavItems(hasBibleBeeEnrollment);

	if (!user) return null;

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
				<div className="flex items-center gap-6">
					<Link href="/household" className="flex items-center gap-2 text-foreground">
						{settings.logo_url ? (
							<Image
								src={settings.logo_url}
								alt={`${settings.app_name || 'gatherKids'} Logo`}
								width={200}
								height={64}
								className="h-10 w-auto object-contain"
								priority
							/>
						) : null}
						{!settings.logo_url || !settings.use_logo_only ? (
							<span className="font-headline text-xl font-bold">
								{settings.app_name || 'gatherKids'}
							</span>
						) : null}
					</Link>

					{/* The same destinations as the tab bar. Hidden rather than
					    duplicated below `md`, where the tab bar is the nav. */}
					<nav aria-label="Household" className="hidden md:flex md:items-center md:gap-1">
						{navItems.map((item) => {
							const active = isGuardianNavItemActive(pathname, item);
							return (
								<Link
									key={item.href}
									href={item.href}
									aria-current={active ? 'page' : undefined}
									className={`rounded-full px-3 py-1.5 text-body-14 transition-colors ${
										active
											? 'bg-brand-aqua/15 font-semibold text-primary'
											: 'text-muted-foreground hover:text-foreground'
									}`}>
									{item.label}
								</Link>
							);
						})}
					</nav>
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="relative h-10 w-10 rounded-full">
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
								<p className="text-sm font-medium leading-none">{user.name}</p>
								<p className="text-xs leading-none text-muted-foreground">
									{user.email}
								</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={onOpenSettings}>
							<Settings className="mr-2" />
							<span>Settings</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={onLogout}>
							<LogOut className="mr-2" />
							<span>Sign Out</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</header>

			{/* The bottom padding clears the fixed tab bar, which would otherwise
			    sit on top of the last row of whatever page this is. */}
			<main id="main-content" className="flex-1 p-4 pb-28 md:p-6 md:pb-6 lg:p-8">
				{children}
			</main>

			<nav
				aria-label="Household"
				className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-background px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
				{navItems.map((item) => {
					const active = isGuardianNavItemActive(pathname, item);
					const Icon = GUARDIAN_TAB_ICONS[item.id];
					return (
						<Link
							key={item.href}
							href={item.href}
							aria-current={active ? 'page' : undefined}
							className={`flex min-h-11 flex-1 flex-col items-center gap-1.5 rounded-md py-1 ${
								active
									? GUARDIAN_TAB_ACTIVE
									: GUARDIAN_TAB_INACTIVE
							}`}>
							<Icon aria-hidden="true" className="h-5 w-5" />
							<span
								className={`${GUARDIAN_TAB_LABEL} ${
									active ? 'font-semibold' : 'font-medium'
								}`}>
								{item.label}
							</span>
						</Link>
					);
				})}
			</nav>
		</div>
	);
}

interface GuardianLayoutClientProps {
	children: React.ReactNode;
	/** Server-evaluated `gathersystem_guardian`. Defaults to legacy. */
	useGatherSystemGuardian?: boolean;
}

/**
 * Picks the household chrome and publishes the flag to the pages inside it.
 *
 * Both shells sit behind the same `HouseholdProtectedRoute`, so the flag never
 * touches who may see this surface — only what it looks like.
 */
export default function GuardianLayoutClient({
	children,
	useGatherSystemGuardian = false,
}: GuardianLayoutClientProps) {
	return (
		<GuardianShellProvider value={useGatherSystemGuardian}>
			<HouseholdProtectedRoute>
				{useGatherSystemGuardian ? (
					<GuardianShellChrome>{children}</GuardianShellChrome>
				) : (
					<HouseholdLayoutLegacy>{children}</HouseholdLayoutLegacy>
				)}
			</HouseholdProtectedRoute>
		</GuardianShellProvider>
	);
}

/**
 * Holds the state the GatherSystem chrome shares with its menu — the Bible Bee
 * enrollment check and the settings modal — so `HouseholdLayoutGatherSystem`
 * stays a presentation component.
 */
function GuardianShellChrome({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const { user, logout } = useAuth();
	const [hasBibleBeeEnrollment, setHasBibleBeeEnrollment] = useState(false);
	const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

	useEffect(() => {
		let cancelled = false;

		const checkBibleBeeEnrollment = async () => {
			if (!user?.uid) return;

			try {
				const householdId = await getHouseholdForUser(user.uid);
				if (!householdId) return;

				const profileData = await getHouseholdProfile(householdId);
				const hasEnrollment = profileData.children.some((child) =>
					(child.enrollments ?? []).some(
						(enrollment) =>
							(enrollment as { ministry_code?: string }).ministry_code ===
							'bible-bee'
					)
				);
				if (!cancelled) setHasBibleBeeEnrollment(hasEnrollment);
			} catch (error) {
				console.error('Failed to check Bible Bee enrollment:', error);
			}
		};

		checkBibleBeeEnrollment();
		return () => {
			cancelled = true;
		};
	}, [user]);

	return (
		<>
			<HouseholdLayoutGatherSystem
				hasBibleBeeEnrollment={hasBibleBeeEnrollment}
				onOpenSettings={() => setIsSettingsModalOpen(true)}
				onLogout={() => {
					logout();
					router.push('/');
				}}>
				{children}
			</HouseholdLayoutGatherSystem>
			<SettingsModal
				isOpen={isSettingsModalOpen}
				onClose={() => setIsSettingsModalOpen(false)}
			/>
		</>
	);
}
