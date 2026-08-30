#!/usr/bin/env node
/**
 * Parse CHANGELOG.md (release-please) into JSON.
 *
 *   node scripts/parse-changelog.mjs           # print JSON
 *   node scripts/parse-changelog.mjs --check   # smoke: at least one release
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const USER_FACING_SECTIONS = {
	Features: 'features',
	'Bug Fixes': 'fixes',
};

const HIDDEN_SCOPES = new Set(['ci', 'chore', 'test', 'build', 'docs']);
const HEADING_RE =
	/^##\s+\[(\d+\.\d+\.\d+)\](?:\(([^)]+)\))?\s+\((\d{4}-\d{2}-\d{2})\)/;
const SECTION_RE = /^###\s+(.+)$/;
const ITEM_RE = /^\*\s+(.+)$/;
const SCOPE_RE = /^\*\*([a-z0-9-]+):\*\*/i;
const PREFIX_TYPE_RE =
	/^(feat|fix|ci|chore|test|build|docs)(?:\([^)]*\))?:\s*/i;

function sectionBucket(heading) {
	return USER_FACING_SECTIONS[heading] ?? 'hidden';
}

function isHiddenItem(raw) {
	const scopeMatch = raw.match(SCOPE_RE);
	if (scopeMatch && HIDDEN_SCOPES.has(scopeMatch[1].toLowerCase())) {
		return true;
	}
	const typeMatch = raw.match(PREFIX_TYPE_RE);
	if (typeMatch && HIDDEN_SCOPES.has(typeMatch[1].toLowerCase())) {
		return true;
	}
	return false;
}

function stripLinksForDedupe(text) {
	return text
		.replace(/\[[^\]]+\]\([^)]+\)/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

export function parseChangelog(markdown) {
	const lines = markdown.split(/\r?\n/);
	const releases = [];
	let current = null;
	let bucket = 'hidden';
	const seen = new Set();

	for (const line of lines) {
		const heading = line.match(HEADING_RE);
		if (heading) {
			if (current) releases.push(current);
			seen.clear();
			current = {
				version: heading[1],
				slug: `v${heading[1]}`,
				date: heading[3],
				compareUrl: heading[2] ?? null,
				features: [],
				fixes: [],
			};
			bucket = 'hidden';
			continue;
		}

		if (!current) continue;

		const section = line.match(SECTION_RE);
		if (section) {
			bucket = sectionBucket(section[1].trim());
			continue;
		}

		const item = line.match(ITEM_RE);
		if (!item || bucket === 'hidden') continue;

		const raw = item[1].trim();
		if (isHiddenItem(raw)) continue;

		const key = `${current.version}:${stripLinksForDedupe(raw)}`;
		if (seen.has(key)) continue;
		seen.add(key);

		current[bucket].push({ text: raw });
	}

	if (current) releases.push(current);
	return releases;
}

export function loadChangelog(cwd = process.cwd()) {
	const markdown = readFileSync(join(cwd, 'CHANGELOG.md'), 'utf8');
	return parseChangelog(markdown);
}

const isMain =
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
	const releases = loadChangelog();
	if (process.argv.includes('--check')) {
		if (releases.length === 0) {
			console.error('parse-changelog: no releases found in CHANGELOG.md');
			process.exit(1);
		}
		const latest = releases[0];
		console.log(
			`parse-changelog: ${releases.length} release(s), latest ${latest.slug} (${latest.date})`
		);
		process.exit(0);
	}
	console.log(JSON.stringify(releases, null, 2));
}
