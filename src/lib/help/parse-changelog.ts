export type ChangelogInline =
	| { type: 'text'; value: string }
	| { type: 'link'; href: string; label: string };

export type ChangelogItem = {
	text: string;
	parts: ChangelogInline[];
};

export type ChangelogRelease = {
	version: string;
	slug: string;
	date: string;
	compareUrl: string | null;
	features: ChangelogItem[];
	fixes: ChangelogItem[];
};

const USER_FACING_SECTIONS = {
	Features: 'features',
	'Bug Fixes': 'fixes',
} as const;

const HIDDEN_SCOPES = new Set(['ci', 'chore', 'test', 'build', 'docs']);

const HEADING_RE =
	/^##\s+\[(\d+\.\d+\.\d+)\](?:\(([^)]+)\))?\s+\((\d{4}-\d{2}-\d{2})\)/;
const SECTION_RE = /^###\s+(.+)$/;
const ITEM_RE = /^\*\s+(.+)$/;
const SCOPE_RE = /^\*\*([a-z0-9-]+):\*\*/i;
const PREFIX_TYPE_RE = /^(feat|fix|ci|chore|test|build|docs)(?:\([^)]*\))?:\s*/i;

type Bucket = 'features' | 'fixes' | 'hidden';

function sectionBucket(heading: string): Bucket {
	const mapped =
		USER_FACING_SECTIONS[heading as keyof typeof USER_FACING_SECTIONS];
	return mapped ?? 'hidden';
}

function isHiddenItem(raw: string): boolean {
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

function stripLinksForDedupe(text: string): string {
	return text
		.replace(/\[[^\]]+\]\([^)]+\)/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:[^)\s]+)\)/g;

function toItem(raw: string): ChangelogItem {
	const parts: ChangelogInline[] = [];
	let lastIndex = 0;
	for (const match of raw.matchAll(MARKDOWN_LINK_RE)) {
		const index = match.index ?? 0;
		if (index > lastIndex) {
			parts.push({ type: 'text', value: raw.slice(lastIndex, index) });
		}
		parts.push({ type: 'link', href: match[2], label: match[1] });
		lastIndex = index + match[0].length;
	}
	if (lastIndex < raw.length) {
		parts.push({ type: 'text', value: raw.slice(lastIndex) });
	}
	if (parts.length === 0) {
		parts.push({ type: 'text', value: raw });
	}
	return { text: raw, parts };
}

/**
 * Parse a release-please CHANGELOG.md into reverse-chronological releases.
 * Keeps user-facing Features / Bug Fixes; drops ci, chore, test, build, docs.
 */
export function parseChangelog(markdown: string): ChangelogRelease[] {
	const lines = markdown.split(/\r?\n/);
	const releases: ChangelogRelease[] = [];
	let current: ChangelogRelease | null = null;
	let bucket: Bucket = 'hidden';
	const seen = new Set<string>();

	const flushSeen = () => {
		seen.clear();
	};

	for (const line of lines) {
		const heading = line.match(HEADING_RE);
		if (heading) {
			if (current) {
				releases.push(current);
			}
			flushSeen();
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

		current[bucket].push(toItem(raw));
	}

	if (current) {
		releases.push(current);
	}

	return releases;
}

export function loadChangelogReleases(markdown: string): ChangelogRelease[] {
	return parseChangelog(markdown);
}

export function findRelease(
	releases: ChangelogRelease[],
	versionOrSlug: string
): ChangelogRelease | undefined {
	const normalized = versionOrSlug.replace(/^v/, '');
	return releases.find(
		(release) => release.version === normalized || release.slug === versionOrSlug
	);
}
