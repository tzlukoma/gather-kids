
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
} from "@/components/ui/dropdown-menu"
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
  Trash2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { SeedDataButton } from '@/components/ministrysync/seed-data-button';
import { useAuth, AuthProvider } from '@/contexts/auth-context';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { FeatureFlagDialog } from '@/components/feature-flag-dialog';

const adminMenuItems = [
  { href: "/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/dashboard/check-in", icon: <CheckCheck />, label: "Check-In/Out" },
  { href: "/dashboard/rosters", icon: <Users />, label: "Rosters" },
  { href: "/dashboard/registrations", icon: <ClipboardList />, label: "Registrations" },
  { href: "/dashboard/incidents", icon: <ShieldAlert />, label: "Incidents" },
  { href: "/dashboard/leaders", icon: <Contact />, label: "Leaders" },
  { href: "/dashboard/reports", icon: <FileText />, label: "Reports" },
  { href: "/dashboard/configuration", icon: <Settings />, label: "Configuration" },
];

const baseLeaderMenuItems = [
  { href: "/dashboard/rosters", icon: <Users />, label: "Rosters" },
  { href: "/dashboard/incidents", icon: <ShieldAlert />, label: "Incidents" },
  { href: "/dashboard/registrations", icon: <ClipboardList />, label: "Registrations" },
];

const inactiveLeaderMenuItems = [
    { href: "/dashboard/incidents", icon: <ShieldAlert />, label: "Incidents" },
]


function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { flags } = useFeatureFlags();
  const [isFlagDialogOpen, setIsFlagDialogOpen] = React.useState(false);
  const [initialRedirectComplete, setInitialRedirectComplete] = React.useState(false);


  const getMenuItems = () => {
    if (user?.role === 'admin') {
        return adminMenuItems;
    }
    if (user?.role === 'leader') {
        if (!user.is_active || !user.assignedMinistryIds || user.assignedMinistryIds.length === 0) {
            return inactiveLeaderMenuItems;
        }

        let menu = [...baseLeaderMenuItems];
        
        // Conditionally add Check-In/Out if the leader is assigned to Sunday School
        if (user.assignedMinistryIds?.includes('min_sunday_school')) {
            menu.unshift({ href: "/dashboard/check-in", icon: <CheckCheck />, label: "Check-In/Out" });
        }
        return menu;
    }
    return [];
  }

  const menuItems = getMenuItems();

  React.useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!initialRedirectComplete && menuItems.length > 0) {
        const topMenuItem = menuItems[0];
        // Only redirect if the user is at the base dashboard and not already on their target page
        if (pathname === '/dashboard' && topMenuItem.href !== '/dashboard') {
            router.replace(topMenuItem.href);
        }
        setInitialRedirectComplete(true);
    }
  }, [user, loading, router, menuItems, initialRedirectComplete, pathname]);
  
  if (loading || !user) {
    return (
        <div className="flex items-center justify-center h-screen">
            <p>Loading...</p>
        </div>
    )
  }


  const handleLogout = () => {
    logout();
    router.push('/');
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <header className="flex items-center justify-between p-4 border-b bg-background z-20 h-16">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
                <Link href="/dashboard" className="flex items-center gap-2 text-foreground">
                    <div className="font-headline text-2xl font-bold">MinistrySync</div>
                </Link>
            </div>
            <div className="flex items-center gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
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
                            <p className="text-sm font-medium leading-none">{user.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                            </p>
                        </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {user.role === 'admin' && flags.showDemoFeatures && <SeedDataButton asChild />}
                        <DropdownMenuItem onSelect={() => setIsFlagDialogOpen(true)}>
                            <Settings className="mr-2" />
                            <span>App Settings</span>
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
                        <div/>
                        <SidebarTrigger className="hidden md:flex" />
                    </div>
                </SidebarHeader>
                <SidebarMenu>
                    {menuItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                            <Link href={item.href} passHref>
                                <SidebarMenuButton tooltip={item.label} isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}>
                                {item.icon}
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
      <FeatureFlagDialog isOpen={isFlagDialogOpen} onClose={() => setIsFlagDialogOpen(false)} />
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
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AuthProvider>
  )
}
