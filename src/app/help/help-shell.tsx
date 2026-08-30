'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BookOpen, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { HelpSidebar } from '@/lib/help/sidebar';

function NavLinks({
	sidebar,
	pathname,
	onNavigate,
}: {
	sidebar: HelpSidebar;
	pathname: string;
	onNavigate?: () => void;
}) {
	return (
		<nav aria-label="User guide" className="space-y-6">
			{sidebar.sections.map((section) => (
				<div key={section.title}>
					<p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						{section.title}
					</p>
					<ul className="space-y-1">
						{section.items.map((item) => {
							const active =
								pathname === item.href ||
								(item.href !== '/help' && pathname.startsWith(`${item.href}/`));
							return (
								<li key={item.href}>
									<Link
										href={item.href}
										onClick={onNavigate}
										className={cn(
											'block rounded-md px-2 py-1.5 text-sm transition-colors',
											active
												? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
												: 'text-sidebar-foreground hover:bg-muted'
										)}>
										{item.title}
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			))}
			<div>
				<p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Releases
				</p>
				<Link
					href="/help/releases"
					onClick={onNavigate}
					className={cn(
						'block rounded-md px-2 py-1.5 text-sm transition-colors',
						pathname.startsWith('/help/releases')
							? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
							: 'text-sidebar-foreground hover:bg-muted'
					)}>
					Release notes
				</Link>
			</div>
		</nav>
	);
}

export function HelpShell({
	sidebar,
	appVersion,
	children,
}: {
	sidebar: HelpSidebar;
	appVersion: string;
	children: ReactNode;
}) {
	const pathname = usePathname();

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
				<div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
					<Sheet>
						<SheetTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="md:hidden"
								aria-label="Open guide navigation">
								<Menu className="h-5 w-5" />
							</Button>
						</SheetTrigger>
						<SheetContent side="left" className="w-80 p-0">
							<SheetHeader className="border-b p-4 text-left">
								<SheetTitle>User guide</SheetTitle>
							</SheetHeader>
							<ScrollArea className="h-[calc(100vh-4rem)] p-4">
								<NavLinks sidebar={sidebar} pathname={pathname} />
							</ScrollArea>
						</SheetContent>
					</Sheet>
					<Link href="/help" className="flex items-center gap-2 font-headline font-semibold">
						<BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
						<span>User guide · v{appVersion}</span>
					</Link>
					<div className="ml-auto flex items-center gap-2">
						<Button variant="ghost" size="sm" asChild>
							<Link href="/help/releases">Release notes</Link>
						</Button>
						<Button variant="outline" size="sm" asChild>
							<Link href="/">Back to gatherKids</Link>
						</Button>
					</div>
				</div>
			</header>
			<div className="mx-auto flex w-full max-w-6xl flex-1">
				<aside className="hidden w-64 shrink-0 border-r md:block">
					<ScrollArea className="h-[calc(100vh-3.5rem)] p-4">
						<NavLinks sidebar={sidebar} pathname={pathname} />
					</ScrollArea>
				</aside>
				<div className="min-w-0 flex-1 px-4 py-8 md:px-8">{children}</div>
			</div>
		</div>
	);
}
