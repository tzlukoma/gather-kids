import {
	activeCheckInEvents,
	checkedInStatusLabel,
	doorEventOptions,
	eventNameLookup,
	eventPickerLabel,
	FALLBACK_CHECK_IN_EVENTS,
	newEventId,
	onSiteEventIds,
	toCheckInEvents,
	validateEventName,
} from '@/lib/check-in-events';

/**
 * Check-in events come from the `events` table (#563 review, #565): adding,
 * renaming or archiving a row changes the pickers without a code edit, and
 * ids never change.
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
		expect(events.slice(3).map((e) => e.name)).toEqual(['Joy Bells', 'Youth Night']);
	});

	it("uses a renamed event's new name and keeps its id and position", () => {
		const events = toCheckInEvents(
			seeded.map((e) =>
				e.event_id === 'evt_sunday_school' ? { ...e, name: 'Sunday Bible Class' } : e
			)
		);
		expect(events[0]).toEqual({
			id: 'evt_sunday_school',
			name: 'Sunday Bible Class',
			archived: false,
		});
	});

	it('marks archived events', () => {
		const [event] = toCheckInEvents([
			{ event_id: 'evt_x', name: 'X', archived_at: '2026-11-05T12:00:00Z' },
		]);
		expect(event.archived).toBe(true);
	});

	it('shows the id rather than a blank option for an unnamed row', () => {
		expect(toCheckInEvents([{ event_id: 'evt_x', name: '  ' }])[0].name).toBe('evt_x');
	});
});

describe('active events and door pickers (#565)', () => {
	const events = [
		{ id: 'evt_sunday_school', name: 'Sunday School', archived: false },
		{ id: 'evt_joy_bells', name: 'Joy Bells', archived: true },
		{ id: 'evt_old', name: 'Old', archived: true },
	];

	it('offers only active events for new check-ins and transfers', () => {
		expect(activeCheckInEvents(events).map((e) => e.id)).toEqual(['evt_sunday_school']);
	});

	it('keeps an archived door while a child is on site there, and only then', () => {
		expect(doorEventOptions(events, ['evt_joy_bells', null]).map((e) => e.id)).toEqual([
			'evt_sunday_school',
			'evt_joy_bells',
		]);
		expect(doorEventOptions(events, []).map((e) => e.id)).toEqual(['evt_sunday_school']);
	});

	it('labels archived events in a picker', () => {
		expect(eventPickerLabel(events[1])).toBe('Joy Bells (archived)');
		expect(eventPickerLabel(events[0])).toBe('Sunday School');
	});

	it("finds who is on site where from today's attendance", () => {
		expect(
			onSiteEventIds([
				{ event_id: 'a', check_out_at: null },
				{ event_id: 'b', check_out_at: '2026-11-05T15:00:00Z' },
				{ event_id: null, check_out_at: null },
			])
		).toEqual(['a']);
	});
});

describe('eventNameLookup', () => {
	it('prefers the persisted name, archived events included, so history reads right', () => {
		const nameOf = eventNameLookup([
			{ id: 'evt_sunday_school', name: 'Sunday Bible Class' },
			{ id: 'evt_joy_bells', name: 'Joy Bells', archived: true },
		]);
		expect(nameOf('evt_sunday_school')).toBe('Sunday Bible Class');
		expect(nameOf('evt_joy_bells')).toBe('Joy Bells');
	});

	it('falls back to the built-in name, then the id, for events no longer in the table', () => {
		const nameOf = eventNameLookup([]);
		expect(nameOf('evt_teen_church')).toBe('Teen Church');
		expect(nameOf('evt_retired')).toBe('evt_retired');
		expect(nameOf(null)).toBe('');
	});

	it('has a fallback list matching the three built-in events, all active', () => {
		expect(FALLBACK_CHECK_IN_EVENTS.map((e) => [e.id, e.archived])).toEqual([
			['evt_sunday_school', false],
			['evt_childrens_church', false],
			['evt_teen_church', false],
		]);
	});
});

describe('validateEventName', () => {
	const events = [
		{ id: 'evt_sunday_school', name: 'Sunday School' },
		{ id: 'evt_joy_bells', name: 'Joy Bells', archived: true },
	];

	it('requires a non-blank name', () => {
		expect(validateEventName('', events)).toBe('Enter a name for the event.');
		expect(validateEventName('   ', events)).toBe('Enter a name for the event.');
	});

	it('limits the length', () => {
		expect(validateEventName('x'.repeat(61), events)).toMatch(/60 characters/);
		expect(validateEventName('x'.repeat(60), events)).toBeNull();
	});

	it('refuses a name another event already has, whatever the case or spacing', () => {
		expect(validateEventName('  sunday   SCHOOL ', events)).toBe(
			'An event called "Sunday School" already exists.'
		);
	});

	it('points at restoring an archived event with the same name', () => {
		expect(validateEventName('Joy Bells', events)).toMatch(/archived event.*Restore it instead/);
	});

	it("lets an event keep or re-case its own name on rename", () => {
		expect(validateEventName('SUNDAY school', events, 'evt_sunday_school')).toBeNull();
	});
});

describe('newEventId', () => {
	it('derives a readable id like the existing ones', () => {
		expect(newEventId('Joy Bells', [])).toBe('evt_joy_bells');
		expect(newEventId("  Kids' Choir — Été ", [])).toBe('evt_kids_choir_ete');
	});

	it('never reuses an id, including one whose event was renamed', () => {
		expect(newEventId('Joy Bells', ['evt_joy_bells'])).toBe('evt_joy_bells_2');
		expect(newEventId('Joy Bells', ['evt_joy_bells', 'evt_joy_bells_2'])).toBe('evt_joy_bells_3');
	});

	it('still produces an id for a name with no letters or digits', () => {
		expect(newEventId('★★★', [])).toBe('evt_event');
	});
});

describe('checkedInStatusLabel (#566)', () => {
	const nameOf = eventNameLookup([
		{ id: 'evt_teen_church', name: 'Youth Service' },
	]);

	it('names the event a checked-in child is in, by its current name', () => {
		expect(checkedInStatusLabel('evt_teen_church', nameOf)).toBe('In Youth Service');
	});

	it('falls back to the built-in name, then the id, for an event not in the list', () => {
		expect(checkedInStatusLabel('evt_sunday_school', nameOf)).toBe('In Sunday School');
		expect(checkedInStatusLabel('evt_gone', nameOf)).toBe('In evt_gone');
	});

	it('does not leave a dangling separator when the row has no event', () => {
		expect(checkedInStatusLabel(null, nameOf)).toBe('Checked in');
	});
});
