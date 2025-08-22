import React from 'react';
import Link from 'next/link';
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
  ClipboardEdit,
  Church,
  User,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary">
                 <Church className="text-primary-foreground h-6 w-6" />
              </div>
              <h1 className="font-headline text-xl font-semibold">MinistrySync</h1>
            </div>
          </SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/dashboard" passHref>
                <SidebarMenuButton tooltip="Dashboard" isActive>
                  <LayoutDashboard />
                  Dashboard
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/dashboard/check-in" passHref>
                <SidebarMenuButton tooltip="Check-In/Out">
                  <CheckCheck />
                  Check-In/Out
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/dashboard/rosters" passHref>
                <SidebarMenuButton tooltip="Rosters">
                  <Users />
                  Rosters
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/dashboard/incidents" passHref>
                <SidebarMenuButton tooltip="Incidents">
                  <ShieldAlert />
                  Incidents
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/dashboard/reports" passHref>
                <SidebarMenuButton tooltip="Reports">
                  <FileText />
                  Reports
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <Separator className="my-2" />
            <SidebarMenuItem>
              <Link href="/register" passHref>
                <SidebarMenuButton tooltip="New Registration">
                  <ClipboardEdit />
                  New Registration
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3">
             <Avatar className="h-8 w-8">
                <AvatarImage src="https://placehold.co/40x40.png" alt="Admin" data-ai-hint="user avatar" />
                <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-sm">
                <span className="font-semibold text-sidebar-foreground">Admin User</span>
                <span className="text-muted-foreground">admin@church.org</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
            <LogOut className="h-4 w-4" />
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
           <SidebarTrigger />
           <p className="font-headline text-lg font-semibold">Welcome, Admin!</p>
           <Button>
              <User className="mr-2" />
              My Profile
            </Button>
        </header>
        <main className="p-4 md:p-6 lg:p-8">
           {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
