import {
	buildChildMeta,
	buildChildRows,
	buildGreeting,
	buildHouseholdLine,
	buildScriptureProgressCopy,
	countWord,
	derivePresence,
	greetingSlotForHour,
	initialsForName,
	ministryNamesForCycle,
	pickGreetedGuardianName,
	progressPercent,
	PRESENCE_LABEL,
} from '@/lib/guardian-home';

describe('greetingSlotForHour', () => {
	it('runs morning up to noon', () => {
		expect(greetingSlotForHour(0)).toBe('morning');
		expect(greetingSlotForHour(11)).toBe('morning');
	});

	it('switches to afternoon at noon and evening at 17:00', () => {
		expect(greetingSlotForHour(12)).toBe('afternoon');
		expect(greetingSlotForHour(16)).toBe('afternoon');
		expect(greetingSlotForHour(17)).toBe('evening');
		expect(greetingSlotForHour(23)).toBe('evening');
	});
});

describe('buildGreeting', () => {
	it('addresses the guardian by first name', () => {
		expect(buildGreeting('morning', 'Tasha')).toBe('Good morning, Tasha');
		expect(buildGreeting('afternoon', 'Tasha')).toBe('Good afternoon, Tasha');
		expect(buildGreeting('evening', 'Tasha')).toBe('Good evening, Tasha');
	});

	it('drops the comma rather than trailing it when there is no name', () => {
		expect(buildGreeting('morning', null)).toBe('Good morning');
		expect(buildGreeting('morning', '   ')).toBe('Good morning');
	});
});

describe('pickGreetedGuardianName', () => {
	it('prefers the primary guardian over list order', () => {
		expect(
			pickGreetedGuardianName([
				{ first_name: 'Marcus', is_primary: false },
				{ first_name: 'Tasha', is_primary: true },
			])
		).toBe('Tasha');
	});

	it('falls back to the first guardian when none is marked primary', () => {
		expect(
			pickGreetedGuardianName([
				{ first_name: 'Marcus' },
				{ first_name: 'Tasha' },
			])
		).toBe('Marcus');
	});

	it('returns null for an empty or nameless household', () => {
		expect(pickGreetedGuardianName([])).toBeNull();
		expect(pickGreetedGuardianName(undefined)).toBeNull();
		expect(pickGreetedGuardianName([{ first_name: '  ' }])).toBeNull();
	});
});

describe('buildHouseholdLine', () => {
	it('joins the household and the cycle', () => {
		expect(buildHouseholdLine('Bennett', 'Fall 2026')).toBe(
			'Bennett household · Fall 2026 cycle'
		);
	});

	it('drops whichever half is missing instead of printing it empty', () => {
		expect(buildHouseholdLine('Bennett', null)).toBe('Bennett household');
		expect(buildHouseholdLine(null, 'Fall 2026')).toBe('Fall 2026 cycle');
		expect(buildHouseholdLine('', '   ')).toBe('');
	});
});

describe('initialsForName', () => {
	it('takes one letter from each name', () => {
		expect(initialsForName('Amara', 'Bennett')).toBe('AB');
		expect(initialsForName('eli', 'bennett')).toBe('EB');
	});

	it('never returns an empty tile', () => {
		expect(initialsForName('Amara', null)).toBe('A');
		expect(initialsForName(null, null)).toBe('?');
		expect(initialsForName('   ', '')).toBe('?');
	});
});

describe('derivePresence', () => {
	const rows = [
		{ child_id: 'amara', check_out_at: null },
		{ child_id: 'eli', check_out_at: '2026-09-21T12:00:00Z' },
	];

	it('reads an open row as on site', () => {
		expect(derivePresence('amara', rows)).toBe('on-site');
	});

	it('reads a checked-out row as not checked in', () => {
		expect(derivePresence('eli', rows)).toBe('not-checked-in');
	});

	it('ignores rows belonging to other children', () => {
		expect(derivePresence('nobody', rows)).toBe('not-checked-in');
	});

	it('handles a missing attendance result', () => {
		expect(derivePresence('amara', undefined)).toBe('not-checked-in');
		expect(derivePresence('amara', [])).toBe('not-checked-in');
	});

	it('labels both states the way the frame does', () => {
		expect(PRESENCE_LABEL['on-site']).toBe('On site');
		expect(PRESENCE_LABEL['not-checked-in']).toBe('Not checked in');
	});
});

describe('ministryNamesForCycle', () => {
	const child = {
		child_id: 'eli',
		enrollmentsByCycle: {
			'cycle-2026': [
				{ ministryName: 'Bible Bee' },
				{ ministryName: 'Choir' },
				{ ministryName: 'Bible Bee' },
			],
			'cycle-2025': [{ ministryName: 'Sunday School' }],
		},
		enrollments: [{ ministryName: 'Flat fallback' }],
	};

	it('returns the active cycle only, in order, without duplicates', () => {
		expect(ministryNamesForCycle(child, 'cycle-2026')).toEqual([
			'Bible Bee',
			'Choir',
		]);
	});

	it('falls back to the flat list when there is no active cycle', () => {
		expect(ministryNamesForCycle(child, null)).toEqual(['Flat fallback']);
	});

	it('returns nothing when the active cycle has no enrollments', () => {
		expect(
			ministryNamesForCycle(
				{ child_id: 'eli', enrollmentsByCycle: {}, enrollments: [] },
				'cycle-2026'
			)
		).toEqual([]);
	});
});

describe('buildChildMeta', () => {
	it('uses the repository grade display, not the Figma casing', () => {
		expect(buildChildMeta('1', ['Sunday School'])).toBe(
			'1st Grade · Sunday School'
		);
	});

	it('joins several ministries with commas', () => {
		expect(buildChildMeta('3', ['Bible Bee', 'Choir'])).toBe(
			'3rd Grade · Bible Bee, Choir'
		);
	});

	it('drops an unknown grade rather than printing "Unknown"', () => {
		expect(buildChildMeta(null, ['Choir'])).toBe('Choir');
		expect(buildChildMeta('', ['Choir'])).toBe('Choir');
	});

	it('survives a child with no ministries', () => {
		expect(buildChildMeta('2', [])).toBe('2nd Grade');
		expect(buildChildMeta(null, [])).toBe('');
	});
});

describe('buildChildRows', () => {
	const children = [
		{
			child_id: 'amara',
			first_name: 'Amara',
			last_name: 'Bennett',
			grade: '1',
			enrollmentsByCycle: { c1: [{ ministryName: 'Sunday School' }] },
		},
		{
			child_id: 'eli',
			first_name: 'Eli',
			last_name: 'Bennett',
			grade: '3',
			enrollmentsByCycle: {
				c1: [{ ministryName: 'Bible Bee' }, { ministryName: 'Choir' }],
			},
		},
	];

	it('builds one row per child with presence resolved', () => {
		const rows = buildChildRows(
			children,
			[{ child_id: 'amara', check_out_at: null }],
			'c1'
		);

		expect(rows).toEqual([
			{
				childId: 'amara',
				name: 'Amara Bennett',
				initials: 'AB',
				meta: '1st Grade · Sunday School',
				presence: 'on-site',
			},
			{
				childId: 'eli',
				name: 'Eli Bennett',
				initials: 'EB',
				meta: '3rd Grade · Bible Bee, Choir',
				presence: 'not-checked-in',
			},
		]);
	});

	it('leaves inactive children off the list', () => {
		const rows = buildChildRows(
			[...children, { child_id: 'old', first_name: 'Old', is_active: false }],
			[],
			'c1'
		);
		expect(rows.map((row) => row.childId)).toEqual(['amara', 'eli']);
	});

	it('returns an empty list rather than throwing on no children', () => {
		expect(buildChildRows(undefined, undefined, null)).toEqual([]);
	});
});

describe('countWord', () => {
	it('spells small numbers the way the frame does', () => {
		expect(countWord(1)).toBe('One');
		expect(countWord(11)).toBe('Eleven');
		expect(countWord(20)).toBe('Twenty');
	});

	it('switches to digits past twenty', () => {
		expect(countWord(21)).toBe('21');
		expect(countWord(100)).toBe('100');
	});

	it('does not print a negative or fractional count', () => {
		expect(countWord(-3)).toBe('0');
		expect(countWord(Number.NaN)).toBe('0');
		expect(countWord(4.7)).toBe('Four');
	});
});

describe('buildScriptureProgressCopy', () => {
	it('counts what is left, spelled out', () => {
		expect(buildScriptureProgressCopy(9, 20)).toBe(
			'Eleven scriptures left to memorize.'
		);
	});

	it('uses the singular for the last one', () => {
		expect(buildScriptureProgressCopy(19, 20)).toBe(
			'One scripture left to memorize.'
		);
	});

	it('celebrates a finished list', () => {
		expect(buildScriptureProgressCopy(20, 20)).toBe('Every scripture memorized.');
		expect(buildScriptureProgressCopy(21, 20)).toBe('Every scripture memorized.');
	});

	it('says so when nothing is assigned', () => {
		expect(buildScriptureProgressCopy(0, 0)).toBe('No scriptures assigned yet.');
	});

	it('starts the nothing-marked state at the full count', () => {
		expect(buildScriptureProgressCopy(0, 20)).toBe(
			'Twenty scriptures left to memorize.'
		);
	});
});

describe('progressPercent', () => {
	it('rounds the fill to a whole percent', () => {
		expect(progressPercent(9, 20)).toBe(45);
		expect(progressPercent(1, 3)).toBe(33);
	});

	it('clamps rather than painting past the track', () => {
		expect(progressPercent(25, 20)).toBe(100);
		expect(progressPercent(-5, 20)).toBe(0);
	});

	it('is empty when nothing is assigned', () => {
		expect(progressPercent(0, 0)).toBe(0);
		expect(progressPercent(5, -1)).toBe(0);
	});
});
