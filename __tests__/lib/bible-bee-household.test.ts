import {
	buildCompletionLine,
	buildEssayIntro,
	buildHeadlineRest,
	buildNothingMarkedIntro,
	defaultTranslation,
	dueDateLabel,
	householdBibleBeeState,
	memorizedRows,
	normalizeEssays,
	normalizeScriptures,
	possessive,
	scriptureCounts,
	scripturesForTab,
	shortDate,
	translationOptions,
	verseFor,
	type HouseholdScripture,
} from '@/lib/bible-bee-household';

function scripture(
	overrides: Partial<HouseholdScripture> & { id: string }
): HouseholdScripture {
	return {
		reference: `Ref ${overrides.id}`,
		number: 1,
		texts: {},
		fallbackText: 'text',
		fallbackTranslation: 'NIV',
		completed: false,
		completedAt: null,
		...overrides,
	};
}

describe('normalizeScriptures', () => {
	it('reads what useStudentAssignmentsQuery returns and sorts by number', () => {
		const out = normalizeScriptures([
			{
				id: 'b',
				status: 'completed',
				completedAt: '2026-10-12T15:00:00Z',
				verseText: 'Be still',
				displayTranslation: 'niv',
				scripture: {
					reference: '  Psalm   46:10 ',
					scripture_number: 2,
					texts: JSON.stringify({ kjv: 'Be still, and know', niv: ' ' }),
				},
			},
			{
				id: 'a',
				status: 'assigned',
				scripture: { reference: 'John 3:16', scripture_order: 1 },
			},
		]);
		expect(out.map((s) => s.id)).toEqual(['a', 'b']);
		expect(out[1]).toMatchObject({
			reference: 'Psalm 46:10',
			number: 2,
			texts: { KJV: 'Be still, and know' },
			fallbackText: 'Be still',
			fallbackTranslation: 'NIV',
			completed: true,
			completedAt: '2026-10-12T15:00:00Z',
		});
		expect(out[0]).toMatchObject({ completed: false, fallbackTranslation: 'KJV' });
	});

	it('numbers by position when no number is declared and drops rows without an id', () => {
		const out = normalizeScriptures([
			{ id: 'x', scripture: { reference: 'A' } },
			{ scripture: { reference: 'no id' } },
			{ id: 'y', scripture: { reference: 'B', texts: 'not json' } },
		]);
		expect(out.map((s) => [s.id, s.number])).toEqual([
			['x', 1],
			['y', 3],
		]);
		expect(out[1].texts).toEqual({});
	});
});

describe('normalizeEssays', () => {
	it('keeps the prompt, due date and submitted state', () => {
		const [open, done] = normalizeEssays([
			{
				id: 'e1',
				status: 'assigned',
				essayPrompt: { title: '', instructions: ' Write ', due_date: '2026-10-26T23:59:00Z' },
			},
			{ id: 'e2', status: 'submitted', submitted_at: '2026-09-20T12:00:00Z', essayPrompt: { title: 'Romans 8' } },
			{ status: 'assigned' },
		]);
		expect(open).toEqual({
			id: 'e1',
			title: 'Essay assignment',
			prompt: 'Write',
			dueDate: '2026-10-26T23:59:00Z',
			submitted: false,
			submittedAt: null,
		});
		expect(done).toMatchObject({ title: 'Romans 8', submitted: true, submittedAt: '2026-09-20T12:00:00Z' });
	});
});

describe('translations', () => {
	const list = [
		scripture({ id: '1', texts: { NIV: 'n1', ESV: 'e1', ZZZ: 'z1' }, fallbackTranslation: 'ESV' }),
		scripture({ id: '2', texts: { KJV: 'k2' }, fallbackText: 'e2', fallbackTranslation: 'ESV' }),
	];

	it('offers every translation any verse carries, common ones first', () => {
		expect(translationOptions(list)).toEqual(['KJV', 'NIV', 'ESV', 'ZZZ']);
	});

	it('falls back to the hook-chosen translations when no verse has a texts map', () => {
		expect(
			translationOptions([
				scripture({ id: '1', fallbackTranslation: 'NKJV' }),
				scripture({ id: '2', fallbackText: '', fallbackTranslation: 'CSB' }),
			])
		).toEqual(['NKJV']);
	});

	it('starts on the household preference the hook applied', () => {
		expect(defaultTranslation(list, translationOptions(list))).toBe('ESV');
		expect(defaultTranslation(list, ['KJV'])).toBe('KJV');
		expect(defaultTranslation([], [])).toBeNull();
	});

	it('never blanks a card when a verse lacks the chosen translation', () => {
		expect(verseFor(list[0], 'NIV')).toEqual({ text: 'n1', translation: 'NIV' });
		expect(verseFor(list[1], 'NIV')).toEqual({ text: 'e2', translation: 'ESV' });
	});
});

describe('tabs and state', () => {
	const list = [
		scripture({ id: 'a', completed: true }),
		scripture({ id: 'b' }),
		scripture({ id: 'c' }),
	];

	it('counts each tab', () => {
		expect(scriptureCounts(list)).toEqual({ todo: 2, done: 1, all: 3 });
	});

	it('filters by tab and keeps cards touched since the tab opened', () => {
		expect(scripturesForTab(list, 'todo').map((s) => s.id)).toEqual(['b', 'c']);
		expect(scripturesForTab(list, 'done').map((s) => s.id)).toEqual(['a']);
		expect(scripturesForTab(list, 'all')).toHaveLength(3);
		expect(scripturesForTab(list, 'todo', new Set(['a'])).map((s) => s.id)).toEqual(['a', 'b', 'c']);
	});

	it('picks the signed frame', () => {
		const essay = normalizeEssays([{ id: 'e', status: 'assigned' }]);
		expect(householdBibleBeeState(list, essay)).toBe('essay');
		expect(householdBibleBeeState([], [])).toBe('empty');
		expect(householdBibleBeeState([scripture({ id: 'x' })], [])).toBe('nothing-marked');
		expect(householdBibleBeeState(list, [])).toBe('in-progress');
		expect(householdBibleBeeState([scripture({ id: 'x', completed: true })], [])).toBe('all-memorized');
	});
});

describe('copy', () => {
	it('builds possessives', () => {
		expect(possessive('Eli')).toBe('Eli’s');
		expect(possessive('  ')).toBe('Your child’s');
		expect(possessive(null)).toBe('Your child’s');
	});

	it('shows "to go" only part-way through', () => {
		expect(buildHeadlineRest(0, 20)).toBe('of 20 memorized');
		expect(buildHeadlineRest(9, 20)).toBe('of 20 memorized · 11 to go');
		expect(buildHeadlineRest(20, 20)).toBe('of 20 memorized');
		expect(buildHeadlineRest(25, 20)).toBe('of 20 memorized');
	});

	it('introduces the nothing-marked and essay states', () => {
		expect(buildNothingMarkedIntro('Eli', 20)).toBe(
			'All 20 scriptures are here. Work through them in any order and tap the check when Eli can say one from memory.'
		);
		expect(buildNothingMarkedIntro(null, 1)).toMatch(/^All 1 scripture is here\..*when your child can/);
		expect(buildEssayIntro('Senior')).toBe(
			'The Senior division is assigned an essay, so there are no scriptures to memorize.'
		);
		expect(buildEssayIntro('')).toMatch(/^This division is assigned/);
	});
});

describe('dates', () => {
	it('shows a timestamp as the church calendar day', () => {
		// 02:00 UTC on the 13th is still the 12th in New York.
		expect(shortDate('2026-10-13T02:00:00Z')).toBe('Oct 12');
		expect(shortDate('2026-10-12')).toBe('Oct 12');
		expect(shortDate('nope')).toBeNull();
		expect(shortDate(null)).toBeNull();
	});

	it('reads an essay due date the way the admin form stores it', () => {
		// Saved from the admin form as Oct 26 with no time: midnight in the UTC fields.
		expect(dueDateLabel('2026-10-26T00:00:00+00:00')).toBe('Oct 26');
		expect(dueDateLabel('2026-10-26T23:59:00Z')).toBe('Oct 26');
		expect(dueDateLabel('2026-10-26')).toBe('Oct 26');
		expect(dueDateLabel('')).toBeNull();
		expect(dueDateLabel('garbage')).toBeNull();
	});
});

describe('all memorized', () => {
	const list = [
		scripture({ id: 'a', number: 1, completed: true, completedAt: '2026-10-01T15:00:00Z' }),
		scripture({ id: 'b', number: 2, completed: true, completedAt: '2026-10-12T15:00:00Z' }),
		scripture({ id: 'c', number: 3, completed: true, completedAt: null }),
		scripture({ id: 'd', number: 4 }),
	];

	it('names the division and the day of the last verse', () => {
		expect(buildCompletionLine('Eli', 'Junior', list)).toBe(
			'Eli marked the last of the Junior division verses on Oct 12.'
		);
	});

	it('says less rather than invent a date or division', () => {
		expect(buildCompletionLine('', null, [scripture({ id: 'x', completed: true })])).toBe(
			'Your child has memorized every one of the verses.'
		);
	});

	it('lists memorized verses by number, or newest first', () => {
		expect(memorizedRows(list, false).map((s) => s.id)).toEqual(['a', 'b', 'c']);
		expect(memorizedRows(list, true).map((s) => s.id)).toEqual(['b', 'a', 'c']);
	});
});
