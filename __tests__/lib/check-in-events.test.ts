import {
	eventNameLookup,
	FALLBACK_CHECK_IN_EVENTS,
	toCheckInEvents,
} from '@/lib/check-in-events';

/**
 * Check-in events come from the `events` table (#563 review): adding or
 * renaming a row changes the pickers without a code edit, and ids never change.
 */
describe('toCheckInEvents', () => {
	const seeded = [
		{ event_id: 'evt_teen_church', name: 'Teen Church' },
		{ event_id: 'evt_sunday_school', name: 'Sunday School' },
		{ event_id: 'evt_childrens_church', name: "Children's Church" },
	];

	it('keeps the order staff know for the long-standing events', () => {
		expect(toCheckInEvents(seeded).map((e) => e.id)).toEqual([
			'evt_sunday_school',
			'evt_childrens_church',
			'evt_teen_church',
		]);
	});

	it('includes an event added to the table, after those, alphabetically', () => {
		const events = toCheckInEvents([
			...seeded,
			{ event_id: 'evt_youth_night', name: 'Youth Night' },
			{ event_id: 'evt_joy_bells', name: 'Joy Bells' },
		]);
		expect(events.slice(3)).toEqual([
			{ id: 'evt_joy_bells', name: 'Joy Bells' },
			{ id: 'evt_youth_night', name: 'Youth Night' },
		]);
	});

	it('uses a renamed event\'s new name and keeps its id and position', () => {
		const events = toCheckInEvents(
			seeded.map((e) =>
				e.event_id === 'evt_sunday_school' ? { ...e, name: 'Sunday Bible Class' } : e
			)
		);
		expect(events[0]).toEqual({ id: 'evt_sunday_school', name: 'Sunday Bible Class' });
	});

	it('shows the id rather than a blank option for an unnamed row', () => {
		expect(toCheckInEvents([{ event_id: 'evt_x', name: '  ' }])).toEqual([
			{ id: 'evt_x', name: 'evt_x' },
		]);
	});
});

describe('eventNameLookup', () => {
	it('prefers the persisted name, so a rename shows everywhere', () => {
		const nameOf = eventNameLookup([{ id: 'evt_sunday_school', name: 'Sunday Bible Class' }]);
		expect(nameOf('evt_sunday_school')).toBe('Sunday Bible Class');
	});

	it('falls back to the built-in name, then the id, for events no longer in the table', () => {
		const nameOf = eventNameLookup([]);
		expect(nameOf('evt_teen_church')).toBe('Teen Church');
		expect(nameOf('evt_retired')).toBe('evt_retired');
		expect(nameOf(null)).toBe('');
	});

	it('has a fallback list matching the three built-in events', () => {
		expect(FALLBACK_CHECK_IN_EVENTS.map((e) => e.id)).toEqual([
			'evt_sunday_school',
			'evt_childrens_church',
			'evt_teen_church',
		]);
	});
});
