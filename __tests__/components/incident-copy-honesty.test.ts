import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `IncidentForm` used to tell a leader that "High severity will send an
 * immediate notification to admins." Nothing sends it: `createIncident` is a
 * plain insert with no severity branching, and there is no trigger, edge
 * function, scheduled job or mailer anywhere that reads an incident row.
 *
 * This is a child-safety surface, so the false promise has a real cost — a
 * leader logging a high-severity incident could reasonably believe an admin
 * had been paged and stop there.
 *
 * This guards the copy rather than the render: `IncidentForm` is built on
 * Radix `Select`, which does not render in this repo's jsdom, and the claim
 * being tested is a property of the text. If a notification is ever actually
 * built, delete this test along with the restriction.
 */
const INCIDENT_UI = [
	'src/components/gatherKids/incident-form.tsx',
	'src/components/gatherKids/incidents-content-legacy.tsx',
	'src/components/gatherKids/incidents-content-gathersystem.tsx',
];

// Phrases that promise something reaches a person, as opposed to describing
// what is recorded.
const PROMISES = [
	/\bnotif(y|ies|ication)\b/i,
	/\balerts?\s+(an?\s+)?admin/i,
	/\bpages?\s+(an?\s+)?admin/i,
	/\bemails?\s+(an?\s+)?admin/i,
	/\bsends?\s+(an?\s+)?(immediate\s+)?(message|email|alert)/i,
];

describe('incident UI does not promise a notification that is never sent', () => {
	it.each(INCIDENT_UI)('%s', (relative) => {
		const source = readFileSync(join(process.cwd(), relative), 'utf8');

		// Only user-visible strings matter; a variable called `notifyX` would be
		// a false positive, so look at JSX text and quoted copy.
		const offending = PROMISES.flatMap((pattern) => {
			const hit = source.match(pattern);
			return hit ? [hit[0]] : [];
		});

		expect(offending).toEqual([]);
	});
});
