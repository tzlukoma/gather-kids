

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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { SeedDataButton } from '@/components/ministrysync/seed-data-button';
import { useAuth, AuthProvider } from '@/contexts/auth-context';

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
                    <div className="font-headline text-2xl font-bold">gatherKids</div>
                </Link>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-headline text-lg font-semibold hidden sm:block">Welcome, {user.name}!</p>
              {user.role === 'admin' && <SeedDataButton />}
               <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="mr-2" />
                  Sign Out
              </Button>
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
                <div className="flex flex-col gap-2">
                    <Separator />
                    <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="https://placehold.co/40x40.png" alt={user.name} data-ai-hint="user avatar" />
                        <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
                        <span className="font-semibold text-sidebar-foreground">{user.name}</span>
                        <span className="text-muted-foreground">{user.email}</span>
                    </div>
                    </div>
                </div>
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
