'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	isEssayHtmlEmpty,
	sanitizeEssayHtml,
	toEssayDisplayHtml,
} from '@/lib/essay-prompt-content';
import { essayRichTextClassName } from '@/components/gatherKids/essay-rich-text';

interface EssayRichTextEditorProps {
	id?: string;
	value: string;
	onChange: (html: string) => void;
	placeholder?: string;
	minHeightClassName?: string;
	'aria-label'?: string;
}

function toolbarButtonClass(active: boolean) {
	return cn(
		'h-8 w-8',
		active && 'bg-accent text-accent-foreground'
	);
}

export function EssayRichTextEditor({
	id,
	value,
	onChange,
	placeholder,
	minHeightClassName = 'min-h-24',
	'aria-label': ariaLabel,
}: EssayRichTextEditorProps) {
	const editor = useEditor({
		immediatelyRender: false,
		shouldRerenderOnTransaction: true,
		extensions: [
			StarterKit.configure({
				heading: false,
				codeBlock: false,
				blockquote: false,
				code: false,
				strike: false,
				horizontalRule: false,
				link: false,
				underline: false,
			}),
		],
		content: toEssayDisplayHtml(value) || '',
		onUpdate: ({ editor: instance }) => {
			const html = instance.getHTML();
			onChange(isEssayHtmlEmpty(html) ? '' : sanitizeEssayHtml(html));
		},
		editorProps: {
			attributes: {
				...(id ? { id } : {}),
				class: cn(
					essayRichTextClassName,
					'text-foreground px-3 py-2 focus:outline-none',
					minHeightClassName
				),
				'aria-label': ariaLabel || placeholder || 'Rich text editor',
			},
		},
	});

	useEffect(() => {
		if (!editor) return;
		const next = toEssayDisplayHtml(value) || '';
		const current = isEssayHtmlEmpty(editor.getHTML())
			? ''
			: sanitizeEssayHtml(editor.getHTML());
		if (current === (isEssayHtmlEmpty(next) ? '' : next)) return;
		editor.commands.setContent(next, { emitUpdate: false });
	}, [editor, value]);

	if (!editor) {
		return (
			<div
				className={cn(
					'rounded-md border border-input bg-background',
					minHeightClassName
				)}
			/>
		);
	}

	return (
		<div className="rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
			<div
				className="flex flex-wrap items-center gap-1 border-b border-input px-1 py-1"
				role="toolbar"
				aria-label="Text formatting">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={toolbarButtonClass(editor.isActive('bold'))}
					aria-pressed={editor.isActive('bold')}
					aria-label="Bold"
					onClick={() => editor.chain().focus().toggleBold().run()}>
					<Bold className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={toolbarButtonClass(editor.isActive('italic'))}
					aria-pressed={editor.isActive('italic')}
					aria-label="Italic"
					onClick={() => editor.chain().focus().toggleItalic().run()}>
					<Italic className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={toolbarButtonClass(editor.isActive('bulletList'))}
					aria-pressed={editor.isActive('bulletList')}
					aria-label="Bullet list"
					onClick={() => editor.chain().focus().toggleBulletList().run()}>
					<List className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={toolbarButtonClass(editor.isActive('orderedList'))}
					aria-pressed={editor.isActive('orderedList')}
					aria-label="Numbered list"
					onClick={() =>
						editor.chain().focus().toggleOrderedList().run()
					}>
					<ListOrdered className="h-4 w-4" />
				</Button>
			</div>
			<EditorContent editor={editor} />
		</div>
	);
}
