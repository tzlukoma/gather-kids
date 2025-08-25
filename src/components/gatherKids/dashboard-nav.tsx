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

interface DashboardNavProps {
	children: React.ReactNode;
}

export function DashboardNav({ children }: DashboardNavProps) {
	const pathname = usePathname();
	const router = useRouter();
	const { user, userRole, logout } = useAuth();

	const handleLogout = () => {
		logout();
		router.replace('/login');
	};

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
		});
		if (!item.roles.includes(userRole)) return false;
		if (item.ministryCheck && user.assignedMinistryIds) {
			return item.ministryCheck(user.assignedMinistryIds);
		}
		return true;
	});

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
							{filteredMenuItems.map((item) => {
								const Icon = item.icon;
								return (
									<SidebarMenuItem
										key={item.href}
										data-active={pathname === item.href}>
										<SidebarMenuButton asChild>
											<Link
												href={item.href}
												className="flex items-center gap-2">
												<Icon className="w-4 h-4" />
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
					<div className="container py-6">{children}</div>
				</main>
			</div>
		</SidebarProvider>
	);
}
