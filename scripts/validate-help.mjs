#!/usr/bin/env node
/**
 * Validate in-app help content: sidebar slugs, internal links, screenshots, changelog.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChangelog } from './parse-changelog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content', 'help');
const publicDir = join(root, 'public');
const errors = [];

function walk(dir, acc = []) {
	if (!existsSync(dir)) {
		errors.push(`Missing directory: ${relative(root, dir)}`);
		return acc;
	}
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, acc);
		else if (entry.endsWith('.md') || entry.endsWith('.mdx')) acc.push(full);
	}
	return acc;
}

function fileToSlug(filePath) {
	return relative(contentDir, filePath).split(sep).join('/').replace(/\.(mdx|md)$/, '');
}

const files = walk(contentDir);
const slugs = new Set(files.map(fileToSlug));

const sidebarPath = join(root, 'src/lib/help/sidebar.ts');
const sidebarSrc = readFileSync(sidebarPath, 'utf8');
const sidebarSlugs = [...sidebarSrc.matchAll(/link\([^,]+,\s*'([^']*)'\)/g)]
	.map((m) => m[1])
	.filter(Boolean);

for (const slug of sidebarSlugs) {
	if (!slugs.has(slug)) {
		errors.push(`Sidebar slug missing content file: ${slug}`);
	}
}

const hrefRe = /\]\((\/help\/[^)\s]+)\)/g;
const shotRe = /(?:\(|src=["'])(\/help\/screenshots\/[^)"'\s]+)(?:\)|["'])/g;

for (const file of files) {
	const body = readFileSync(file, 'utf8');
	const rel = relative(root, file);
	let match;
	hrefRe.lastIndex = 0;
	while ((match = hrefRe.exec(body)) !== null) {
		const href = match[1].split('#')[0];
		if (href === '/help' || href === '/help/releases') continue;
		if (href.startsWith('/help/releases/')) continue;
		if (href.startsWith('/help/screenshots/')) continue;
		const slug = href.replace(/^\/help\//, '');
		if (!slugs.has(slug)) {
			errors.push(`${rel}: broken help link ${href}`);
		}
	}
	shotRe.lastIndex = 0;
	while ((match = shotRe.exec(body)) !== null) {
		const publicPath = join(publicDir, match[1].replace(/^\//, ''));
		if (!existsSync(publicPath)) {
			errors.push(`${rel}: missing screenshot ${match[1]}`);
		}
	}
}

try {
	const releases = loadChangelog(root);
	if (releases.length === 0) {
		errors.push('CHANGELOG.md parsed to zero releases');
	}
} catch (error) {
	errors.push(`Changelog parse failed: ${error.message}`);
}

if (errors.length) {
	console.error('docs:validate failed:\n' + errors.map((e) => ` - ${e}`).join('\n'));
	process.exit(1);
}

console.log(
	`docs:validate passed (${files.length} help pages, ${sidebarSlugs.length} sidebar articles)`
);
