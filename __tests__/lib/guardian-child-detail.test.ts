import {
	ageFromDob,
	allergyAlert,
	buildChildHeaderMeta,
	buildEnrollmentRows,
	cycleEyebrow,
	emergencyContactLines,
	pickupGuardians,
	selfCheckoutLine,
	specialNeedsSummary,
} from '@/lib/guardian-child-detail';

const TODAY = '2026-09-28';

describe('ageFromDob', () => {
	it('returns whole years on the given day', () => {
		expect(ageFromDob('2017-03-14', TODAY)).toBe(9);
		expect(ageFromDob('2013-09-28', TODAY)).toBe(13);
		expect(ageFromDob('2013-09-29', TODAY)).toBe(12);
	});

	it('is null without a usable date', () => {
		expect(ageFromDob(undefined, TODAY)).toBeNull();
		expect(ageFromDob('garbage', TODAY)).toBeNull();
	});
});

describe('buildChildHeaderMeta', () => {
	it('joins grade, age, birth date and household', () => {
		expect(
			buildChildHeaderMeta({
				grade: '3',
				dob: '2017-03-14',
				householdName: 'Test Household',
				todayIso: TODAY,
			})
		).toBe('3rd Grade · Age 9 · Born Mar 14, 2017 · Test Household');
	});

	it('drops what is missing instead of printing it empty', () => {
		expect(buildChildHeaderMeta({ todayIso: TODAY })).toBe('');
		expect(
			buildChildHeaderMeta({ grade: null, dob: '2017-03-14', todayIso: TODAY })
		).toBe('Age 9 · Born Mar 14, 2017');
	});
});

describe('allergyAlert', () => {
	it('returns the text when there is something to warn about', () => {
		expect(allergyAlert(' Peanuts ')).toBe('Peanuts');
	});

	it('treats blank and no-allergy answers as nothing', () => {
		for (const value of [null, undefined, '', '  ', 'None', 'none.', 'N/A', 'NKDA', 'no']) {
			expect(allergyAlert(value)).toBeNull();
		}
	});
});

describe('specialNeedsSummary', () => {
	it('says No and hides notes when the flag is off', () => {
		expect(
			specialNeedsSummary({ child_id: 'c', special_needs: false, special_needs_notes: 'x' })
		).toEqual({ label: 'No', notes: null });
	});

	it('says Yes with the notes when the flag is on', () => {
		expect(
			specialNeedsSummary({
				child_id: 'c',
				special_needs: true,
				special_needs_notes: ' Needs a quiet room ',
			})
		).toEqual({ label: 'Yes', notes: 'Needs a quiet room' });
	});
});

describe('buildEnrollmentRows', () => {
	const child = {
		child_id: 'c1',
		enrollmentsByCycle: {
			fall: [
				{ enrollment_id: 'e1', ministryName: 'Sunday School', ministry_code: 'sunday-school', status: 'enrolled' },
				{ enrollment_id: 'e2', ministryName: 'Bible Bee', ministry_code: 'bible-bee', status: 'enrolled' },
				{ enrollment_id: 'e3', ministryName: 'Choir', ministry_code: 'choir', status: 'expressed_interest' },
				{ enrollment_id: 'e4', ministryName: 'Dance', ministry_code: 'dance', status: 'withdrawn' },
			],
			spring: [{ enrollment_id: 'e5', ministryName: 'Old', ministry_code: 'old', status: 'enrolled' }],
		},
	};

	it('lists the active cycle without withdrawn enrollments', () => {
		expect(buildEnrollmentRows(child, 'fall')).toEqual([
			{ key: 'e1', name: 'Sunday School', status: 'enrolled', isBibleBee: false },
			{ key: 'e2', name: 'Bible Bee', status: 'enrolled', isBibleBee: true },
			{ key: 'e3', name: 'Choir', status: 'interested', isBibleBee: false },
		]);
	});

	it('finds Bible Bee by code, not name', () => {
		const renamed = {
			child_id: 'c2',
			enrollmentsByCycle: {
				fall: [{ ministryName: 'Bible Bee 2026', ministry_code: 'bible-bee', status: 'enrolled' }],
			},
		};
		expect(buildEnrollmentRows(renamed, 'fall')[0].isBibleBee).toBe(true);
	});

	it('is empty when the child has nothing this cycle', () => {
		expect(buildEnrollmentRows({ child_id: 'c3', enrollmentsByCycle: {} }, 'fall')).toEqual([]);
	});
});

describe('cycleEyebrow', () => {
	it('names the active cycle', () => {
		expect(cycleEyebrow({ fall: 'Fall 2026' }, 'fall')).toBe('Fall 2026 cycle');
	});

	it('is null between cycles or without a name', () => {
		expect(cycleEyebrow({ fall: 'Fall 2026' }, null)).toBeNull();
		expect(cycleEyebrow({}, 'fall')).toBeNull();
	});
});

describe('selfCheckoutLine', () => {
	it('is not eligible under 13', () => {
		expect(
			selfCheckoutLine({ child_id: 'c', dob: '2017-03-14', child_mobile: '5550000000' }, TODAY)
		).toEqual({ eligible: false, text: 'Not eligible — under 13' });
	});

	it('is not eligible at 13 without a phone', () => {
		expect(selfCheckoutLine({ child_id: 'c', dob: '2013-01-01' }, TODAY)).toEqual({
			eligible: false,
			text: 'Not eligible — no phone on file',
		});
	});

	it('is eligible at 13 with a phone', () => {
		expect(
			selfCheckoutLine({ child_id: 'c', dob: '2013-01-01', child_mobile: '5550000000' }, TODAY)
		).toEqual({ eligible: true, text: 'Eligible' });
	});

	it('treats an unknown age as under 13', () => {
		expect(
			selfCheckoutLine({ child_id: 'c', child_mobile: '5550000000' }, TODAY).eligible
		).toBe(false);
	});
});

describe('emergencyContactLines', () => {
	it('names the contact with relationship and phone', () => {
		expect(
			emergencyContactLines({
				first_name: 'Pat',
				last_name: 'Example',
				relationship: 'Aunt',
				mobile_phone: '5550000001',
			})
		).toEqual({ name: 'Pat Example (Aunt)', phone: '(555) 000-0001' });
	});

	it('is null without a contact', () => {
		expect(emergencyContactLines(null)).toBeNull();
		expect(emergencyContactLines({ first_name: ' ', last_name: '' })).toBeNull();
	});
});

describe('pickupGuardians', () => {
	it('lists named guardians with phones', () => {
		expect(
			pickupGuardians([
				{ first_name: 'Alex', last_name: 'Example', mobile_phone: '5550000002' },
				{ first_name: 'Sam', last_name: 'Example', mobile_phone: '' },
				{ first_name: '', last_name: '' },
			])
		).toEqual([
			{ name: 'Alex Example', phone: '(555) 000-0002' },
			{ name: 'Sam Example', phone: null },
		]);
	});
});
