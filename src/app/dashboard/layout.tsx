
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { SeedDataButton } from '@/components/ministrysync/seed-data-button';
import { useAuth, AuthProvider } from '@/contexts/auth-context';

const adminMenuItems = [
  { href: "/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/dashboard/check-in", icon: <CheckCheck />, label: "Check-In/Out" },
  { href: "/dashboard/rosters", icon: <Users />, label: "Rosters" },
  { href: "/dashboard/incidents", icon: <ShieldAlert />, label: "Incidents" },
  { href: "/dashboard/reports", icon: <FileText />, label: "Reports" },
];

const leaderMenuItems = [
  { href: "/dashboard/check-in", icon: <CheckCheck />, label: "Check-In/Out" },
  { href: "/dashboard/incidents", icon: <ShieldAlert />, label: "Incidents" },
];


function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  if (loading || !user) {
    return (
        <div className="flex items-center justify-center h-screen">
            <p>Loading...</p>
        </div>
    )
  }

  const menuItems = user?.role === 'admin' ? adminMenuItems : leaderMenuItems;

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
                                <SidebarMenuButton tooltip={item.label} isActive={pathname === item.href}>
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
