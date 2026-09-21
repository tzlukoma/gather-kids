import {
	buildBibleBeeStripLabel,
	buildChildMeta,
	buildChildRows,
	buildGreeting,
	buildHouseholdLine,
	buildScriptureCountLabel,
	buildScriptureProgressCopy,
	countWord,
	derivePresence,
	greetingSlotForHour,
	initialsForName,
	isEnrolledInBibleBee,
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
				{ ministryName: 'Bible Bee', ministry_code: 'bible-bee' },
				{ ministryName: 'Choir', ministry_code: 'choir' },
				{ ministryName: 'Bible Bee', ministry_code: 'bible-bee' },
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

	it('drops an excluded ministry by code, not by display name', () => {
		expect(
			ministryNamesForCycle(child, 'cycle-2026', {
				excludeCodes: ['bible-bee'],
			})
		).toEqual(['Choir']);
	});

	it('leaves a same-named ministry alone when its code differs', () => {
		expect(
			ministryNamesForCycle(
				{
					child_id: 'eli',
					enrollmentsByCycle: {
						c1: [{ ministryName: 'Bible Bee', ministry_code: 'bible-study' }],
					},
				},
				'c1',
				{ excludeCodes: ['bible-bee'] }
			)
		).toEqual(['Bible Bee']);
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
			enrollmentsByCycle: {
				c1: [{ ministryName: 'Sunday School', ministry_code: 'sunday-school' }],
			},
		},
		{
			child_id: 'eli',
			first_name: 'Eli',
			last_name: 'Bennett',
			grade: '3',
			enrollmentsByCycle: {
				c1: [
					{ ministryName: 'Bible Bee', ministry_code: 'bible-bee' },
					{ ministryName: 'Choir', ministry_code: 'choir' },
				],
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
				firstName: 'Amara',
				initials: 'AB',
				meta: '1st Grade · Sunday School',
				presence: 'on-site',
				inBibleBee: false,
			},
			{
				childId: 'eli',
				name: 'Eli Bennett',
				firstName: 'Eli',
				initials: 'EB',
				meta: '3rd Grade · Choir',
				presence: 'not-checked-in',
				inBibleBee: true,
			},
		]);
	});

	it('never names Bible Bee in the meta of a child whose card carries the strip', () => {
		const rows = buildChildRows(children, [], 'c1');
		for (const row of rows) {
			if (row.inBibleBee) expect(row.meta).not.toContain('Bible Bee');
		}
		// And the other ministries survive the exclusion rather than being lost
		// with it \u2014 dropping the whole list would also pass the check above.
		expect(rows.find((row) => row.childId === 'eli')?.meta).toBe(
			'3rd Grade \u00b7 Choir'
		);
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

describe('buildBibleBeeStripLabel', () => {
	it('names the division the child is in', () => {
		expect(buildBibleBeeStripLabel('Junior')).toBe('Bible Bee · Junior');
		expect(buildBibleBeeStripLabel('Primary')).toBe('Bible Bee · Primary');
	});

	it('drops the separator rather than trailing it', () => {
		expect(buildBibleBeeStripLabel(null)).toBe('Bible Bee');
		expect(buildBibleBeeStripLabel(undefined)).toBe('Bible Bee');
		expect(buildBibleBeeStripLabel('   ')).toBe('Bible Bee');
	});

	it('never repeats the child\u2019s name \u2014 the card already carries it', () => {
		expect(buildBibleBeeStripLabel('Junior')).not.toMatch(/Sophia|Eli|Noah/);
	});
});

describe('buildScriptureCountLabel', () => {
	it('counts completed against required', () => {
		expect(buildScriptureCountLabel(9, 20)).toBe('9 of 20');
		expect(buildScriptureCountLabel(0, 12)).toBe('0 of 12');
	});

	it('says nothing rather than \u201c0 of 0\u201d when nothing is assigned', () => {
		expect(buildScriptureCountLabel(0, 0)).toBeNull();
		expect(buildScriptureCountLabel(3, -1)).toBeNull();
		expect(buildScriptureCountLabel(3, Number.NaN)).toBeNull();
	});

	it('cannot print more completed than required', () => {
		expect(buildScriptureCountLabel(25, 20)).toBe('20 of 20');
		expect(buildScriptureCountLabel(-4, 20)).toBe('0 of 20');
	});
});

describe('isEnrolledInBibleBee', () => {
	const bee = { ministryName: 'Bible Bee', ministry_code: 'bible-bee' };
	const choir = { ministryName: 'Choir', ministry_code: 'choir' };

	it('reads the active cycle\u2019s enrollments', () => {
		const child = {
			child_id: 'eli',
			enrollmentsByCycle: { c1: [choir, bee], c2: [choir] },
		};
		expect(isEnrolledInBibleBee(child, 'c1')).toBe(true);
		expect(isEnrolledInBibleBee(child, 'c2')).toBe(false);
	});

	it('is false for a child with no Bible Bee enrollment', () => {
		expect(
			isEnrolledInBibleBee(
				{ child_id: 'amara', enrollmentsByCycle: { c1: [choir] } },
				'c1'
			)
		).toBe(false);
	});

	it('matches the ministry code, not the display name', () => {
		expect(
			isEnrolledInBibleBee(
				{
					child_id: 'eli',
					enrollmentsByCycle: {
						c1: [{ ministryName: 'Bible Bee', ministry_code: 'choir' }],
					},
				},
				'c1'
			)
		).toBe(false);
	});

	it('decides the same way the meta line does, including between cycles', () => {
		// The strip and the meta read the same enrollments, so a child can never
		// get a strip whose ministry the meta denies, or the reverse.
		const child = { child_id: 'eli', enrollments: [bee] };
		expect(isEnrolledInBibleBee(child, null)).toBe(true);
		expect(ministryNamesForCycle(child, null)).toContain('Bible Bee');

		const other = { child_id: 'amara', enrollments: [choir] };
		expect(isEnrolledInBibleBee(other, null)).toBe(false);
		expect(ministryNamesForCycle(other, null)).not.toContain('Bible Bee');
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
