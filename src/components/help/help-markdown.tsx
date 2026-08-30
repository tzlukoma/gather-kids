import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function HelpImg({
	src,
	alt,
}: {
	src?: string;
	alt?: string;
}) {
	if (!src) return null;
	if (src.startsWith('/help/screenshots/')) {
		return (
			<figure className="my-6 overflow-hidden rounded-lg border bg-card">
				{/* Baseline PNGs are committed raster captures; skip next/image optimization. */}
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={src}
					alt={alt || ''}
					width={1280}
					height={800}
					className="h-auto w-full"
				/>
				{alt ? (
					<figcaption className="px-3 py-2 text-sm text-muted-foreground">
						{alt}
					</figcaption>
				) : null}
			</figure>
		);
	}
	return (
		// External or other public assets
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt || ''} className="my-4 h-auto max-w-full rounded-md border" />
	);
}

export function HelpMarkdown({ content }: { content: string }) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			components={{
				h1: ({ children }) => (
					<h1 className="font-headline text-3xl font-bold tracking-tight">
						{children}
					</h1>
				),
				h2: ({ children }) => (
					<h2 className="mt-10 font-headline text-2xl font-semibold tracking-tight">
						{children}
					</h2>
				),
				h3: ({ children }) => (
					<h3 className="mt-8 text-xl font-semibold">{children}</h3>
				),
				h4: ({ children }) => (
					<h4 className="mt-6 text-lg font-semibold">{children}</h4>
				),
				p: ({ children }) => (
					<p className="leading-7 text-foreground/90">{children}</p>
				),
				ul: ({ children }) => (
					<ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>
				),
				ol: ({ children }) => (
					<ol className="my-4 list-decimal space-y-2 pl-6">{children}</ol>
				),
				li: ({ children }) => <li className="leading-7">{children}</li>,
				a: ({ href, children }) => {
					if (href?.startsWith('/')) {
						return (
							<Link
								href={href}
								className="font-medium text-primary underline underline-offset-4">
								{children}
							</Link>
						);
					}
					return (
						<a
							href={href}
							className="font-medium text-primary underline underline-offset-4"
							rel={href?.startsWith('http') ? 'noreferrer' : undefined}
							target={href?.startsWith('http') ? '_blank' : undefined}>
							{children}
						</a>
					);
				},
				strong: ({ children }) => (
					<strong className="font-semibold">{children}</strong>
				),
				blockquote: ({ children }) => (
					<blockquote className="my-4 border-l-4 border-primary/40 pl-4 text-muted-foreground">
						{children}
					</blockquote>
				),
				hr: () => <hr className="my-8 border-border" />,
				img: ({ src, alt }) => (
					<HelpImg src={typeof src === 'string' ? src : undefined} alt={alt} />
				),
				code: ({ children, className }) => {
					const isBlock = Boolean(className);
					if (isBlock) {
						return (
							<code className="block overflow-x-auto rounded-md bg-muted p-3 text-sm">
								{children}
							</code>
						);
					}
					return (
						<code className="rounded bg-muted px-1.5 py-0.5 text-sm">
							{children}
						</code>
					);
				},
			}}>
			{content}
		</ReactMarkdown>
	);
}
