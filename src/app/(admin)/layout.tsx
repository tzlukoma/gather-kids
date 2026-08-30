'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
	LayoutDashboard,
	CheckCheck,
	Users,
	ShieldAlert,
	FileText,
	User,
	LogOut,
	Settings,
	ClipboardList,
	Contact,
	Database,
	Trash2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AuthRole } from '@/lib/auth-types';
import { AdminSkeleton } from '@/components/skeletons/admin-skeleton';
import { useBranding } from '@/contexts/branding-context';
import { SettingsModal } from '@/components/settings/settings-modal';
import { renderNavIcon } from '@/components/ui/nav-icon';
import { AppVersionBadge } from '@/components/AppVersionBadge';

import { getAuthorizedMenuItems } from '@/lib/navigation';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const { user, loading, logout, userRole } = useAuth();
	const { settings } = useBranding();
	const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);

	const getMenuItems = () => {
		return getAuthorizedMenuItems(
			userRole,
			user?.assignedMinistryIds ?? [],
			user?.is_active ?? true
		);
	};

	const menuItems = getMenuItems();

	// renderNavIcon is imported from @/components/ui/nav-icon (MAINT-19)

	React.useEffect(() => {
		console.log('DashboardLayout: useEffect triggered', {
			loading,
			user: user ? { uid: user.uid, role: user.metadata?.role } : null,
			menuItemsLength: menuItems.length,
			pathname,
		});

		if (loading) return;

		if (!user) {
			console.log('DashboardLayout: No user, redirecting to login');
			router.push('/login');
			return;
		}

		// If user exists but has no authorized menu items, redirect to login
		if (menuItems.length === 0) {
			console.log(
				'DashboardLayout: User has no authorized menu items, redirecting to login'
			);
			router.push('/login');
			return;
		}

		// Redirect to first authorized page if needed
		if (menuItems.length > 0) {
			const topMenuItem = menuItems[0];
			// /dashboard redirects here via next.config.ts; no additional redirect needed
			// The first menu item is used as the landing page for each role
		}
	}, [user, loading, router, menuItems, pathname]);

	if (loading) {
		return <AdminSkeleton />;
	}

	if (!user) {
		return <AdminSkeleton />; // Show loading while redirecting to login
	}

	const handleLogout = () => {
		logout();
		router.push('/');
	};

	return (
		<SidebarProvider>
			<div className="flex flex-col min-h-screen">
				<header className="flex items-center justify-between p-4 border-b bg-background z-20 h-16">
					<div className="flex items-center gap-4">
						<SidebarTrigger className="md:hidden" />
						<Link
							href="/admin-overview"
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
										<AvatarImage src={undefined} alt={user.name} />
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
													(item.href !== '/admin-overview' && pathname.startsWith(item.href))
												}>
												{renderNavIcon(item.icon)}
												<span className="flex-1">{item.label}</span>
												{item.isBeta && (
													<Badge
														variant="secondary"
														className="text-xs px-1.5 py-0.5 ml-auto bg-blue-100 text-blue-800 border border-blue-200">
														Beta
													</Badge>
												)}
											</SidebarMenuButton>
										</Link>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarContent>
						<SidebarFooter className="p-2 flex flex-col items-center gap-2">
							<Link
								href="/help"
								className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
								About gatherKids
							</Link>
							<AppVersionBadge />
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

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ProtectedRoute
			allowedRoles={[AuthRole.ADMIN, AuthRole.MINISTRY_LEADER]}
			loadingComponent={<AdminSkeleton />}>
			<DashboardLayoutContent>{children}</DashboardLayoutContent>
		</ProtectedRoute>
	);
}
