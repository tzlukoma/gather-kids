'use client';

import type { ReactNode } from 'react';
import {
	Card,
	CardContent,
	CardHeader,
} from '@/components/ui/card';
import {
	formatEssayDueDate,
	isEssayHtmlEmpty,
} from '@/lib/essay-prompt-content';
import { EssayRichText } from '@/components/gatherKids/essay-rich-text';

export type EssayPromptContentFields = {
	title?: string | null;
	prompt?: string | null;
	instructions?: string | null;
	due_date?: string | null;
};

interface EssayPromptDisplayProps extends EssayPromptContentFields {
	/** When true, render the essay title above the labeled sections. */
	showTitle?: boolean;
	className?: string;
}

export function EssayPromptDisplay({
	title,
	prompt,
	instructions,
	due_date,
	showTitle = false,
	className,
}: EssayPromptDisplayProps) {
	const hasInstructions = !isEssayHtmlEmpty(instructions);
	const hasPrompt = !isEssayHtmlEmpty(prompt);
	const hasDueDate = Boolean(due_date);

	return (
		<div className={className ?? 'space-y-4'}>
			{showTitle && title ? (
				<h3 className="font-medium">{title}</h3>
			) : null}
			{hasInstructions ? (
				<div>
					<h4 className="font-medium mb-2">Instructions</h4>
					<EssayRichText html={instructions} />
				</div>
			) : null}
			{hasPrompt ? (
				<div>
					<h4 className="font-medium mb-2">Prompt</h4>
					<EssayRichText html={prompt} />
				</div>
			) : null}
			{hasDueDate && due_date ? (
				<div>
					<h4 className="font-medium mb-1">Due Date</h4>
					<p className="text-sm text-muted-foreground">
						{formatEssayDueDate(due_date)}
					</p>
				</div>
			) : null}
		</div>
	);
}

interface EssayCardProps {
	essayPrompt: EssayPromptContentFields;
	children?: ReactNode;
}

export default function EssayCard({ essayPrompt, children }: EssayCardProps) {
	return (
		<Card>
			<CardHeader>
				<h2 className="text-2xl font-semibold leading-none tracking-tight">
					{essayPrompt.title || 'Essay Assignment'}
				</h2>
			</CardHeader>
			<CardContent className="space-y-4">
				<EssayPromptDisplay
					prompt={essayPrompt.prompt}
					instructions={essayPrompt.instructions}
					due_date={essayPrompt.due_date}
				/>
				{children}
			</CardContent>
		</Card>
	);
}
