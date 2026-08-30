import Link from 'next/link';
import type { Metadata } from 'next';
import { HELP_SIDEBAR } from '@/lib/help/sidebar';
import { getAppVersion } from '@/lib/help/app-version';
import { getChangelogReleases } from '@/lib/help/load-changelog';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-static';

export const metadata: Metadata = {
	title: 'User guide · gatherKids',
	description: 'Guides for families, ministry leaders, and administrators.',
};

export default function HelpHomePage() {
	const version = getAppVersion();
	const latest = getChangelogReleases()[0];

	return (
		<main id="main-content" className="space-y-8">
			<div>
				<p className="text-sm font-medium text-primary">gatherKids help</p>
				<h1 className="mt-1 font-headline text-3xl font-bold tracking-tight">
					User guide
				</h1>
				<p className="mt-3 max-w-2xl text-muted-foreground">
					Learn how to register your family, check children in and out, and
					manage ministries. This guide ships with the app (v{version}) so it
					always matches what you see in gatherKids.
				</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				{HELP_SIDEBAR.sections.map((section) => (
					<Card key={section.title}>
						<CardHeader>
							<CardTitle className="text-lg">{section.title}</CardTitle>
							<CardDescription>
								<ul className="mt-2 space-y-1">
									{section.items.slice(0, 4).map((item) => (
										<li key={item.href}>
											<Link
												href={item.href}
												className="text-primary underline-offset-4 hover:underline">
												{item.title}
											</Link>
										</li>
									))}
								</ul>
							</CardDescription>
						</CardHeader>
					</Card>
				))}
			</div>
			{latest ? (
				<p className="text-sm text-muted-foreground">
					Latest release:{' '}
					<Link
						href={`/help/releases/${latest.slug}`}
						className="font-medium text-primary underline underline-offset-4">
						{latest.slug}
					</Link>{' '}
					({latest.date}). See all{' '}
					<Link
						href="/help/releases"
						className="font-medium text-primary underline underline-offset-4">
						release notes
					</Link>
					.
				</p>
			) : null}
		</main>
	);
}
