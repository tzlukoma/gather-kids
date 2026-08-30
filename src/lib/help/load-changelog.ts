import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	findRelease,
	parseChangelog,
	type ChangelogRelease,
} from '@/lib/help/parse-changelog';

export function readChangelogMarkdown(cwd = process.cwd()): string {
	return readFileSync(join(cwd, 'CHANGELOG.md'), 'utf8');
}

export function getChangelogReleases(cwd = process.cwd()): ChangelogRelease[] {
	return parseChangelog(readChangelogMarkdown(cwd));
}

export function getChangelogRelease(
	versionOrSlug: string,
	cwd = process.cwd()
): ChangelogRelease | undefined {
	return findRelease(getChangelogReleases(cwd), versionOrSlug);
}
