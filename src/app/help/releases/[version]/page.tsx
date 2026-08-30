import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
	getChangelogRelease,
	getChangelogReleases,
} from '@/lib/help/load-changelog';
import type { ChangelogItem } from '@/lib/help/parse-changelog';

export const dynamic = 'force-static';

type Params = { version: string };

export function generateStaticParams(): Params[] {
	return getChangelogReleases().map((release) => ({ version: release.slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<Params>;
}): Promise<Metadata> {
	const { version } = await params;
	const release = getChangelogRelease(version);
	if (!release) {
		return { title: 'Release · gatherKids' };
	}
	return {
		title: `${release.slug} release notes · gatherKids`,
		description: `User-facing changes in gatherKids ${release.slug}.`,
	};
}

function ItemList({
	title,
	items,
}: {
	title: string;
	items: ChangelogItem[];
}) {
	if (items.length === 0) return null;
	return (
		<section className="space-y-3">
			<h2 className="font-headline text-2xl font-semibold">{title}</h2>
			<ul className="list-disc space-y-2 pl-6">
				{items.map((item) => (
					<li key={item.text} className="leading-7">
						{item.parts.map((part, index) =>
							part.type === 'link' ? (
								<a
									key={`${part.href}-${index}`}
									href={part.href}
									className="underline underline-offset-2 hover:text-primary"
									rel="noopener noreferrer">
									{part.label}
								</a>
							) : (
								<span key={index}>{part.value}</span>
							)
						)}
					</li>
				))}
			</ul>
		</section>
	);
}

export default async function HelpReleaseDetailPage({
	params,
}: {
	params: Promise<Params>;
}) {
	const { version } = await params;
	const release = getChangelogRelease(version);
	if (!release) {
		notFound();
	}

	const empty = release.features.length === 0 && release.fixes.length === 0;

	return (
		<article id="main-content" className="mx-auto max-w-3xl space-y-6">
			<p className="text-sm">
				<Link
					href="/help/releases"
					className="text-primary underline underline-offset-4">
					All releases
				</Link>
			</p>
			<header>
				<h1 className="font-headline text-3xl font-bold tracking-tight">
					{release.slug}
				</h1>
				<p className="mt-2 text-muted-foreground">{release.date}</p>
			</header>
			{empty ? (
				<p>No user-facing feature or fix notes were recorded for this version.</p>
			) : (
				<>
					<ItemList title="New" items={release.features} />
					<ItemList title="Fixes" items={release.fixes} />
				</>
			)}
		</article>
	);
}
