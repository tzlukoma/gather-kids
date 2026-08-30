import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HelpMarkdown } from '@/components/help/help-markdown';
import { allHelpSlugs } from '@/lib/help/sidebar';
import { loadHelpDoc } from '@/lib/help/load-guide';

export const dynamic = 'force-static';

type Params = { slug?: string[] };

export function generateStaticParams(): Params[] {
	return allHelpSlugs().map((slug) => ({ slug: slug.split('/') }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<Params>;
}): Promise<Metadata> {
	const { slug: parts } = await params;
	const slug = (parts ?? []).join('/');
	const doc = loadHelpDoc(slug);
	if (!doc) {
		return { title: 'Help · gatherKids' };
	}
	return {
		title: `${doc.title} · User guide`,
		description: doc.description,
	};
}

export default async function HelpArticlePage({
	params,
}: {
	params: Promise<Params>;
}) {
	const { slug: parts } = await params;
	const slug = (parts ?? []).join('/');
	if (!slug) {
		notFound();
	}
	const doc = loadHelpDoc(slug);
	if (!doc) {
		notFound();
	}

	return (
		<article id="main-content" className="mx-auto max-w-3xl space-y-4">
			<HelpMarkdown content={doc.content} />
		</article>
	);
}
