
'use client';

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
  User,
  LogOut,
  Settings,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { SeedDataButton } from '@/components/ministrysync/seed-data-button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
              <p className="font-headline text-lg font-semibold hidden sm:block">Welcome, Admin!</p>
              <Button variant="outline">
                  <User className="mr-2" />
                  My Profile
              </Button>
              <SeedDataButton />
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
                    <SidebarMenuItem>
                    <Link href="/dashboard" passHref>
                        <SidebarMenuButton tooltip="Dashboard" isActive>
                        <LayoutDashboard />
                        <span>Dashboard</span>
                        </SidebarMenuButton>
                    </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <Link href="/dashboard/check-in" passHref>
                        <SidebarMenuButton tooltip="Check-In/Out">
                        <CheckCheck />
                        <span>Check-In/Out</span>
                        </SidebarMenuButton>
                    </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <Link href="/dashboard/rosters" passHref>
                        <SidebarMenuButton tooltip="Rosters">
                        <Users />
                        <span>Rosters</span>
                        </SidebarMenuButton>
                    </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <Link href="/dashboard/incidents" passHref>
                        <SidebarMenuButton tooltip="Incidents">
                        <ShieldAlert />
                        <span>Incidents</span>
                        </SidebarMenuButton>
                    </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <Link href="/dashboard/reports" passHref>
                        <SidebarMenuButton tooltip="Reports">
                        <FileText />
                        <span>Reports</span>
                        </SidebarMenuButton>
                    </Link>
                    </SidebarMenuItem>
                    <Separator className="my-2" />
                    <SidebarMenuItem>
                    <Link href="/register" passHref>
                        <SidebarMenuButton tooltip="New Registration">
                        <ClipboardEdit />
                        <span>New Registration</span>
                        </SidebarMenuButton>
                    </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                <div className="flex flex-col gap-2">
                    <Separator />
                    <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="https://placehold.co/40x40.png" alt="Admin" data-ai-hint="user avatar" />
                        <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
                        <span className="font-semibold text-sidebar-foreground">Admin User</span>
                        <span className="text-muted-foreground">admin@church.org</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto group-data-[collapsible=icon]:hidden">
                        <LogOut className="h-4 w-4" />
                    </Button>
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
