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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const Logo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 160 40"
    className="h-8 w-auto"
    fill="currentColor"
  >
    <path
      d="M58.33,2.4a8.33,8.33,0,0,1,8.34,8.33V29.27a8.33,8.33,0,0,1-16.67,0V10.73a8.33,8.33,0,0,1,8.33-8.33m0,3.33a5,5,0,0,0-5,5v18.54a5,5,0,1,0,10,0V10.73a5,5,0,0,0-5-5"
      transform="translate(0 0)"
    />
    <path
      d="M3.33,10.73a8.33,8.33,0,0,1,8.34-8.33H22.92a5,5,0,0,1,0,10H15v4.17h7.92a5,5,0,0,1,0,10H15v9.17a5,5,0,1,1-10,0V10.73Z"
      transform="translate(0 0)"
    />
    <path
      d="M29.17,10.73a8.33,8.33,0,0,1,8.33-8.33h1.25a5,5,0,0,1,0,10H37.5v16.67a5,5,0,1,1-10,0V10.73h1.67Z"
      transform="translate(0 0)"
    />
    <path
      d="M72.92,10.73a8.33,8.33,0,0,1,8.33-8.33h1.25a5,5,0,0,1,0,10H81.25v16.67a5,5,0,1,1-10,0V10.73h1.67Z"
      transform="translate(0 0)"
    />
    <path
      d="M87.5,10.73a8.33,8.33,0,0,1,8.33-8.33h6.25a8.33,8.33,0,0,1,8.34,8.33V29.27a5,5,0,1,1-10,0V22.92h-2.92v6.35a5,5,0,1,1-10,0V10.73m12.92,8.34V10.73a5,5,0,0,0-5-5H91.67a5,5,0,0,0-5,5v18.54a1.67,1.67,0,1,0,3.33,0V22.92h5a5,5,0,0,1,5,5,1.67,1.67,0,1,0,3.33,0V22.08a8.33,8.33,0,0,1-8.33-8.33"
      transform="translate(0 0)"
    />
    <path
      d="M112.5,5.73a5,5,0,0,1,5,5V29.27a5,5,0,1,1-10,0v-10h-2.5a5,5,0,1,1,0-10h12.5a5,5,0,1,1,0,10h-1.67v10a1.67,1.67,0,1,0,3.33,0V10.73a8.33,8.33,0,0,0-8.33-8.33,5,5,0,0,1-3.33,9.17V9.09a5,5,0,0,1,5-5Z"
      transform="translate(0 0)"
    />
    <path
      d="M129.58,18.42a5,5,0,0,1,4.58-4.92,4.86,4.86,0,0,1,5.1,4.08,8.23,8.23,0,0,1,.4,2.6,8.33,8.33,0,0,1-8.33,8.33H129a5,5,0,0,1,0-10h2.17a1.67,1.67,0,0,0,0-3.33H129a8.33,8.33,0,0,1,0-16.67h12.5a8.33,8.33,0,0,1,8.33,8.33,5,5,0,0,1-10,0V15.92a1.67,1.67,0,0,0-1.67-1.67h-2.08a5,5,0,0,1-1.25,10.33,5,5,0,0,1-5-5.33"
      transform="translate(0 0)"
    />
    <path
      fillRule="evenodd"
      d="M135.45,0.22a5,5,0,0,1,7.07,0l16.67,16.67a5,5,0,0,1-7.07,7.07L135.45,7.29,126.6,16.14A5,5,0,0,1,119.53,9.07l15.92-15.92Z"
      transform="translate(0 0)"
      className="text-primary"
    />
  </svg>
);

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
            <div className="flex items-center gap-2 text-foreground">
              <Logo />
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
