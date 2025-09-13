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
import { Separator } from '@/components/ui/separator';
import { SeedDataButton } from '@/components/gatherKids/seed-data-button';
import { useAuth, AuthProvider } from '@/contexts/auth-context';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { FeatureFlagDialog } from '@/components/feature-flag-dialog';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ROLES } from '@/lib/constants/roles';
import { AdminSkeleton } from '@/components/skeletons/admin-skeleton';
import { useBranding } from '@/contexts/branding-context';
import { SettingsModal } from '@/components/settings/settings-modal';

import { getAuthorizedMenuItems } from '@/lib/navigation';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const { user, loading, logout, userRole } = useAuth();
	const { flags } = useFeatureFlags();
	const { settings } = useBranding();
	const [isFlagDialogOpen, setIsFlagDialogOpen] = React.useState(false);
	const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);

	const getMenuItems = () => {
		return getAuthorizedMenuItems(
			userRole,
			user?.assignedMinistryIds ?? [],
			user?.is_active ?? true
		);
	};

	const menuItems = getMenuItems();

	function renderIcon(Icon: any) {
		// Handle React elements (like the Bible Bee SVG)
		if (React.isValidElement(Icon)) return Icon;

		// Handle Lucide React components (they are objects with forwardRef)
		if (Icon && typeof Icon === 'object' && Icon.$$typeof) {
			const C = Icon as React.ComponentType<{ className?: string }>;
			return <C className="w-4 h-4" />;
		}

		// Handle function components (fallback)
		if (typeof Icon === 'function') {
			const C = Icon as React.ComponentType<{ className?: string }>;
			return <C className="w-4 h-4" />;
		}

		return null;
	}

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

		// Redirect to first authorized page if on base dashboard
		if (menuItems.length > 0) {
			const topMenuItem = menuItems[0];
			// Only redirect if the user is at the base dashboard and not already on their target page
			if (pathname === '/dashboard' && topMenuItem.href !== '/dashboard') {
				console.log(
					'DashboardLayout: Redirecting to first authorized page:',
					topMenuItem.href
				);
				router.replace(topMenuItem.href);
			}
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
							href="/dashboard"
							className="flex items-center gap-2 text-foreground">
							{settings.logo_url ? (
								<>
									<img
										src={settings.logo_url}
										alt={`${settings.app_name || 'gatherKids'} Logo`}
										className={`h-16 w-auto ${
											settings.use_logo_only ? '' : 'max-w-[50%]'
										} object-contain`}
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
								{userRole === ROLES.ADMIN && flags.showDemoFeatures && (
									<SeedDataButton asChild />
								)}
								{flags.showDemoFeatures && (
									<DropdownMenuItem onSelect={() => setIsFlagDialogOpen(true)}>
										<Settings className="mr-2" />
										<span>App Settings</span>
									</DropdownMenuItem>
								)}
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
													pathname.startsWith(item.href) &&
													(item.href !== '/dashboard' ||
														pathname === '/dashboard')
												}>
												{renderIcon(item.icon)}
												<span>{item.label}</span>
											</SidebarMenuButton>
										</Link>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarContent>
						<SidebarFooter className="p-2 flex justify-center"></SidebarFooter>
					</Sidebar>
					<SidebarInset>
						<main className="p-4 md:p-6 lg:p-8">{children}</main>
					</SidebarInset>
				</div>
			</div>
			{flags.showDemoFeatures && (
				<FeatureFlagDialog
					isOpen={isFlagDialogOpen}
					onClose={() => setIsFlagDialogOpen(false)}
				/>
			)}
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
		<AuthProvider>
			<ProtectedRoute
				allowedRoles={[ROLES.ADMIN, ROLES.MINISTRY_LEADER]}
				loadingComponent={<AdminSkeleton />}>
				<DashboardLayoutContent>{children}</DashboardLayoutContent>
			</ProtectedRoute>
		</AuthProvider>
	);
}
