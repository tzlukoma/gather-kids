import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('daily-digest Sentry cron monitor configuration', () => {
	const workflow = readFileSync(
		path.join(root, '.github/workflows/daily-digest.yml'),
		'utf8'
	);

	it('uses UTC timezone for the Sentry monitor so check-ins match the GitHub Actions cron execution', () => {
		// GitHub Actions schedule cron runs in UTC.
		const scheduleMatch = workflow.match(/schedule:\s*(?:#.*\n\s*)*- cron:\s*['"]([^'"]+)['"]/);
		expect(scheduleMatch).toBeTruthy();
		const actionsCron = scheduleMatch?.[1];
		expect(actionsCron).toBe('0 11 * * *');

		// sentry-cli monitors run upserts the monitor schedule.
		const sentryScheduleMatch = workflow.match(/--schedule\s+['"]([^'"]+)['"]/);
		const sentryTimezoneMatch = workflow.match(/--timezone\s+['"]([^'"]+)['"]/);
		expect(sentryScheduleMatch).toBeTruthy();
		expect(sentryTimezoneMatch).toBeTruthy();

		const sentrySchedule = sentryScheduleMatch?.[1];
		const sentryTimezone = sentryTimezoneMatch?.[1];

		expect(sentrySchedule).toBe(actionsCron);
		// The monitor schedule must be expressed in UTC because GitHub Actions cron
		// always fires at the UTC time (11:00 UTC). Using America/New_York would
		// tell Sentry to expect the check-in at 11:00 ET, ~5 hours after the
		// actual run, which exceeds the check-in margin and marks the monitor as
		// erroring. See issue #593.
		expect(sentryTimezone).toBe('UTC');
	});
});
