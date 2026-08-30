import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import matter from 'gray-matter';

export type HelpDoc = {
	slug: string;
	title: string;
	description?: string;
	content: string;
};

const CONTENT_DIR = join(process.cwd(), 'content', 'help');

function walkMarkdown(dir: string, acc: string[] = []): string[] {
	if (!existsSync(dir)) return acc;
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			walkMarkdown(full, acc);
		} else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
			acc.push(full);
		}
	}
	return acc;
}

function fileToSlug(filePath: string): string {
	const rel = relative(CONTENT_DIR, filePath).split(sep).join('/');
	return rel.replace(/\.(mdx|md)$/, '');
}

export function listHelpFiles(): string[] {
	return walkMarkdown(CONTENT_DIR);
}

export function loadHelpDoc(slug: string): HelpDoc | null {
	const md = join(CONTENT_DIR, `${slug}.md`);
	const mdx = join(CONTENT_DIR, `${slug}.mdx`);
	const filePath = existsSync(md) ? md : existsSync(mdx) ? mdx : null;
	if (!filePath) return null;

	const raw = readFileSync(filePath, 'utf8');
	const parsed = matter(raw);
	const title =
		(typeof parsed.data.title === 'string' && parsed.data.title) ||
		parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
		slug;
	const description =
		typeof parsed.data.description === 'string'
			? parsed.data.description
			: undefined;

	return {
		slug,
		title,
		description,
		content: parsed.content,
	};
}

export function loadAllHelpDocs(): HelpDoc[] {
	return listHelpFiles()
		.map((file) => loadHelpDoc(fileToSlug(file)))
		.filter((doc): doc is HelpDoc => doc !== null);
}

export function extractHelpHrefTargets(markdown: string): string[] {
	const targets: string[] = [];
	const re = /\]\((\/help\/[^)\s]+)\)/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(markdown)) !== null) {
		targets.push(match[1].split('#')[0]);
	}
	return targets;
}

export function extractScreenshotPaths(markdown: string): string[] {
	const paths: string[] = [];
	const re = /(?:\(|src=["'])(\/help\/screenshots\/[^)"'\s]+)(?:\)|["'])/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(markdown)) !== null) {
		paths.push(match[1]);
	}
	return paths;
}
