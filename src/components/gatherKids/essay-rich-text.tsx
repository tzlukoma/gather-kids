'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { isEssayHtmlEmpty, toEssayDisplayHtml } from '@/lib/essay-prompt-content';

export const essayRichTextClassName =
	'essay-rich-text text-sm text-muted-foreground leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic [&_i]:italic';

export function EssayRichText({
	html,
	className,
}: {
	html: string | null | undefined;
	className?: string;
}) {
	const safeHtml = useMemo(() => toEssayDisplayHtml(html), [html]);

	if (!safeHtml || isEssayHtmlEmpty(safeHtml)) {
		return null;
	}

	return (
		<div
			className={cn(essayRichTextClassName, className)}
			dangerouslySetInnerHTML={{ __html: safeHtml }}
		/>
	);
}
