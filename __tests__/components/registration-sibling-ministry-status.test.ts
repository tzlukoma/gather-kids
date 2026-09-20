import {
	formatMinistryLabels,
	selectedMinistryCodes,
	siblingMinistryStatuses,
} from '@/components/gatherKids/registration-wizard/sibling-ministry-status';

const ministries = [
	{ code: 'min-sunday-school', name: 'Sunday School' },
	{ code: 'choir-joy', name: 'Joy Bells' },
	{ code: 'min-acolyte', name: 'Acolytes' },
];

const amara = {
	child_id: 'c-amara',
	first_name: 'Amara',
	ministrySelections: { 'min-sunday-school': true, 'choir-joy': true },
};

const kofi = {
	child_id: 'c-kofi',
	first_name: 'Kofi',
	ministrySelections: {},
};

describe('selectedMinistryCodes', () => {
	it('returns only the ticked codes', () => {
		expect(
			selectedMinistryCodes({
				ministrySelections: { a: true, b: false, c: undefined, d: true },
			})
		).toEqual(['a', 'd']);
	});

	it('is empty for a child with no selections', () => {
		expect(selectedMinistryCodes(kofi)).toEqual([]);
		expect(selectedMinistryCodes(undefined)).toEqual([]);
		expect(selectedMinistryCodes({})).toEqual([]);
	});
});

describe('siblingMinistryStatuses', () => {
	const base = {
		children: [amara, kofi],
		ministries,
		existingChildIds: ['c-amara', 'c-kofi'],
		enabled: true,
	};

	it('names the child and what they kept', () => {
		expect(siblingMinistryStatuses(base)).toEqual([
			{
				childIndex: 0,
				childId: 'c-amara',
				name: 'Amara',
				ministryLabels: ['Joy Bells', 'Sunday School'],
				firstMinistryCode: 'choir-joy',
			},
		]);
	});

	it('says nothing about a child with no saved selections', () => {
		// Kofi is on file but chose nothing last year. "Kofi's ministries already
		// saved" with an empty list would be worse than silence.
		expect(siblingMinistryStatuses(base).map((s) => s.name)).toEqual(['Amara']);
	});

	it('says nothing for a first-time family', () => {
		// Nothing has ever been saved, so every tick on screen is this sitting's.
		expect(
			siblingMinistryStatuses({ ...base, enabled: false })
		).toEqual([]);
	});

	it('ignores a child added during this session', () => {
		// No child_id yet: whatever is ticked, the parent ticked it just now.
		const withNewChild = {
			...base,
			children: [
				amara,
				{ first_name: 'New', ministrySelections: { 'min-acolyte': true } },
			],
		};
		expect(siblingMinistryStatuses(withNewChild).map((s) => s.name)).toEqual([
			'Amara',
		]);
	});

	it('ignores a child whose id is not on the household record', () => {
		expect(
			siblingMinistryStatuses({ ...base, existingChildIds: ['c-kofi'] })
		).toEqual([]);
	});

	it('falls back to the code when a ministry has no name', () => {
		// A ministry removed from the catalogue since last year still has to be
		// nameable, or the card lists a blank line.
		const status = siblingMinistryStatuses({
			...base,
			children: [{ ...amara, ministrySelections: { 'min-retired': true } }],
			ministries: [],
		});
		expect(status[0].ministryLabels).toEqual(['min-retired']);
	});

	it('preserves child order from the form', () => {
		const both = {
			...base,
			children: [
				{ ...kofi, ministrySelections: { 'min-acolyte': true } },
				amara,
			],
		};
		expect(siblingMinistryStatuses(both).map((s) => s.name)).toEqual([
			'Kofi',
			'Amara',
		]);
		expect(siblingMinistryStatuses(both).map((s) => s.childIndex)).toEqual([
			0, 1,
		]);
	});

	it('points Review at the first ministry the child kept', () => {
		expect(siblingMinistryStatuses(base)[0].firstMinistryCode).toBe('choir-joy');
	});

	it('names an unnamed child by position', () => {
		const status = siblingMinistryStatuses({
			...base,
			children: [{ ...amara, first_name: '' }],
		});
		expect(status[0].name).toBe('Child 1');
	});

	it('copes with empty input', () => {
		expect(
			siblingMinistryStatuses({
				children: null,
				ministries: null,
				existingChildIds: null,
				enabled: true,
			})
		).toEqual([]);
	});
});

describe('formatMinistryLabels', () => {
	it.each([
		[[], ''],
		[['Sunday School'], 'Sunday School'],
		[['Sunday School', 'Joy Bells'], 'Sunday School and Joy Bells'],
		[['A', 'B', 'C'], 'A, B and C'],
	])('renders %j as %s', (labels, expected) => {
		expect(formatMinistryLabels(labels as string[])).toBe(expected);
	});
});
