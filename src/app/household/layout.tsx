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
import {
	Home,
	Book,
	User,
	LogOut,
	Settings,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ROLES } from '@/lib/constants/roles';
import { GuardianSkeleton } from '@/components/skeletons/guardian-skeleton';
import { useEffect, useState } from 'react';
import { getHouseholdProfile } from '@/lib/dal';
import type { HouseholdProfileData } from '@/lib/dal';

function HouseholdLayoutContent({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const { user, logout } = useAuth();
	const [hasBibleBeeEnrollment, setHasBibleBeeEnrollment] = useState(false);

	useEffect(() => {
		const checkBibleBeeEnrollment = async () => {
			if (!user?.metadata?.household_id) return;
			
			try {
				const profileData = await getHouseholdProfile(user.metadata.household_id);
				const hasEnrollment = profileData.children.some(child => 
					Object.values(child.enrollmentsByCycle).some(enrollments =>
						enrollments.some(enrollment => enrollment.ministry_id === 'bible-bee')
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
		...(hasBibleBeeEnrollment ? [{
			label: 'Bible Bee',
			href: '/household/bible-bee',
			icon: Book,
		}] : []),
		{
			label: 'Profile',
			href: '/household/profile',
			icon: User,
		},
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
								<DropdownMenuItem onSelect={() => {}}>
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
													(item.href === '/household/bible-bee' && pathname.startsWith('/household/bible-bee'))
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
						<main className="p-4 md:p-6 lg:p-8">
							{children}
						</main>
					</SidebarInset>
				</div>
			</div>
		</SidebarProvider>
	);
}

interface GuardianLayoutProps {
	children: React.ReactNode;
}

export default function GuardianLayout({ children }: GuardianLayoutProps) {
	return (
		<ProtectedRoute
			allowedRoles={[ROLES.GUARDIAN]}
			loadingComponent={<GuardianSkeleton />}>
			<HouseholdLayoutContent>{children}</HouseholdLayoutContent>
		</ProtectedRoute>
	);
}
