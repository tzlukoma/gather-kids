import Link from 'next/link';
import type { Metadata } from 'next';
import { getChangelogReleases } from '@/lib/help/load-changelog';

export const dynamic = 'force-static';

export const metadata: Metadata = {
	title: 'Release notes · gatherKids',
	description: 'User-facing changes from gatherKids releases, newest first.',
};

export default function HelpReleasesPage() {
	const releases = getChangelogReleases();

	return (
		<main id="main-content" className="mx-auto max-w-3xl space-y-6">
			<div>
				<h1 className="font-headline text-3xl font-bold tracking-tight">
					Release notes
				</h1>
				<p className="mt-2 text-muted-foreground">
					Generated from <code className="rounded bg-muted px-1.5 py-0.5 text-sm">CHANGELOG.md</code>{' '}
					(release-please). Internal chores, CI, tests, and docs-only commits
					are hidden.
				</p>
			</div>
			<ol className="space-y-4">
				{releases.map((release) => {
					const count = release.features.length + release.fixes.length;
					return (
						<li key={release.slug} className="rounded-lg border p-4">
							<Link
								href={`/help/releases/${release.slug}`}
								className="font-headline text-xl font-semibold text-primary hover:underline">
								{release.slug}
							</Link>
							<p className="mt-1 text-sm text-muted-foreground">
								{release.date}
								{count === 0
									? ' · No user-facing feature or fix notes in this release'
									: ` · ${release.features.length} feature${release.features.length === 1 ? '' : 's'}, ${release.fixes.length} fix${release.fixes.length === 1 ? '' : 'es'}`}
							</p>
						</li>
					);
				})}
			</ol>
		</main>
	);
}
