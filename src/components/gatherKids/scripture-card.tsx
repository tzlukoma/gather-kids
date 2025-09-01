'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import React from 'react';
import DOMPurify from 'dompurify';

interface ScriptureCardProps {
	assignment: any;
	index: number;
	onToggleAction?: (id: string, next: boolean) => void;
	// When true, render the same visual card but without completion controls or click handlers
	readOnly?: boolean;
	// Optional override for which version to display (e.g. 'NIV', 'KJV')
	displayVersion?: string;
}

export default function ScriptureCard({
	assignment,
	index,
	onToggleAction,
	readOnly = false,
	displayVersion,
}: ScriptureCardProps) {
	const completed = assignment.status === 'completed';

	// Always prioritize the reference text as the primary identifier
	const reference =
		assignment.scripture?.reference ?? assignment.scriptureId ?? '';

	// Normalize reference for consistent display
	const normalizedReference = React.useMemo(() => {
		return reference.trim().replace(/\s+/g, ' ');
	}, [reference]);

	// Ensure we have the correct scripture data by reference
	const scripture = assignment.scripture || {};
	const scriptureReference = normalizedReference;

	// choose verse HTML by preference: displayVersion prop -> assignment.verseText -> scripture.texts map -> scripture.text
	const textsMap =
		(assignment.scripture as any)?.texts ??
		(assignment.scripture as any)?.alternateTexts ??
		undefined;
	const requestedVersion = displayVersion ?? undefined;

	// Get the appropriate verse text based on version
	let verseHtml = assignment.verseText ?? scripture.text ?? '';
	if (requestedVersion && textsMap) {
		// normalize keys for case-insensitive lookup
		const norm: Record<string, string> = {};
		Object.keys(textsMap).forEach((k) => {
			norm[String(k).toUpperCase()] = textsMap[k];
		});
		const found = norm[String(requestedVersion).toUpperCase()];
		if (found) verseHtml = found;
	}

	// Use scripture_order as the primary field for display purposes, not for matching
	// Explicitly ignore any legacy 'order' field
	const scriptureNumber =
		assignment.scripture?.scripture_number ??
		assignment.scripture?.scripture_order ??
		assignment.scripture?.sortOrder ??
		String(index + 1);
	const seq = `#${scriptureNumber}`;
	let translation =
		assignment.displayTranslation ??
		assignment.scripture?.translation ??
		assignment.scripture?.version ??
		'KJV';
	if (requestedVersion) translation = requestedVersion;

	// Sanitize verse HTML for safe insertion. Allow basic formatting used in scriptures.
	const safeHtml = React.useMemo(() => {
		try {
			return DOMPurify.sanitize(verseHtml, {
				ALLOWED_TAGS: [
					'sup',
					'br',
					'strong',
					'em',
					'p',
					'ul',
					'li',
					'ol',
					'span',
				],
				ALLOWED_ATTR: ['class'],
			});
		} catch (e) {
			return verseHtml;
		}
	}, [verseHtml]);

	return (
		<Card className="w-full rounded-lg shadow-sm bg-white border border-gray-200">
			<CardHeader
				className={`${
					completed ? 'bg-green-50' : 'bg-white'
				} flex-row justify-between gap-3 px-4 py-3`}>
				<div className="flex-1 min-w-0 flex flex-col justify-center">
					<CardTitle className="text-xl font-semibold truncate">
						{normalizedReference}
					</CardTitle>
					<div className="mt-2 flex flex-wrap gap-2">
						<span className="bg-background border px-2 py-0.5 rounded-full text-xs text-muted-foreground">
							{seq}
						</span>
						<span className="bg-background border px-2 py-0.5 rounded-full text-xs text-muted-foreground">
							{translation}
						</span>
					</div>
				</div>

				{!readOnly && (
					<div className="flex-shrink-0">
						<button
							type="button"
							aria-pressed={completed}
							aria-label={completed ? 'Mark not completed' : 'Mark completed'}
							onClick={() =>
								onToggleAction && onToggleAction(assignment.id, !completed)
							}
							className={`inline-flex items-center justify-center h-10 w-10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
								completed
									? 'bg-green-600 text-white shadow'
									: 'border border-gray-300 text-gray-600 bg-white'
							}`}>
							<Check
								className={`h-5 w-5 ${
									completed ? 'text-white' : 'text-gray-600'
								}`}
							/>
						</button>
					</div>
				)}
			</CardHeader>

			<CardContent className="px-4 pb-4 pt-3">
				<div
					className="prose max-w-none text-md scripture font-scripture"
					dangerouslySetInnerHTML={{ __html: safeHtml }}
				/>
			</CardContent>
		</Card>
	);
}
