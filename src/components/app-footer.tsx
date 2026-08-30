'use client';

import Link from 'next/link';

export function AppFooter({ appName = 'gatherKids' }: { appName?: string }) {
	return (
		<footer className="py-6 border-t mt-auto">
			<div className="container mx-auto flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center text-sm text-muted-foreground px-4">
				<p>
					&copy; {new Date().getFullYear()} {appName}. All rights reserved.
				</p>
				<Link
					href="/help"
					className="hover:text-foreground underline-offset-4 hover:underline">
					About gatherKids
				</Link>
			</div>
		</footer>
	);
}
