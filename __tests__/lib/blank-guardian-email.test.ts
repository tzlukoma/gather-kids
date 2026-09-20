import { registrationSchema } from '@/components/gatherKids/registration-wizard/registration-schema';
import { GuardianWriteDto } from '@/lib/database/canonical-dtos';

/**
 * #460: a blank guardian email made the registration wizard permanently
 * unsubmittable, with no message on any step the guardian could see.
 *
 * `z.string().email().optional()` admits `undefined` but not `''` — and `''` is
 * what every empty text input in this form holds. The same mistake appears at
 * two layers, so fixing only the first moves the dead end from "the button
 * never enables" to "a generic Submission Error toast after clicking it".
 */

/** A registration that is valid in every respect except the field under test. */
function registration(guardianEmail?: string) {
	return {
		household: {
			address_line1: '100 Test St',
			city: 'Perth Amboy',
			state: 'NJ',
			zip: '08861',
		},
		guardians: [
			{
				first_name: 'Alex',
				last_name: 'Rivera',
				mobile_phone: '5551234567',
				relationship: 'Mother',
				is_primary: true,
				...(guardianEmail === undefined ? {} : { email: guardianEmail }),
			},
		],
		emergencyContact: {
			first_name: 'Sam',
			last_name: 'Lee',
			mobile_phone: '5559876543',
			relationship: 'Aunt',
		},
		children: [
			{
				first_name: 'Sky',
				last_name: 'Rivera',
				dob: '2016-03-02',
				grade: '4th',
				allergies: 'none',
			},
		],
		consents: { liability: true, photoRelease: true },
	};
}

function guardian(email?: string) {
	return {
		household_id: 'household-1',
		first_name: 'Alex',
		last_name: 'Rivera',
		mobile_phone: '5551234567',
		relationship: 'Mother',
		is_primary: true,
		...(email === undefined ? {} : { email }),
	};
}

describe('the wizard form schema', () => {
	it('accepts a guardian who has not filled in an email', () => {
		// The submit button is gated on whole-form validity, so this single
		// field decides whether the family can register at all.
		expect(registrationSchema.safeParse(registration('')).success).toBe(true);
	});

	it('still accepts an omitted email', () => {
		expect(registrationSchema.safeParse(registration(undefined)).success).toBe(true);
	});

	it('still accepts a real email', () => {
		expect(registrationSchema.safeParse(registration('alex@example.com')).success).toBe(
			true
		);
	});

	it('still rejects a malformed email, with wording a guardian can act on', () => {
		const result = registrationSchema.safeParse(registration('alex-at-example'));
		expect(result.success).toBe(false);
		if (result.success) return;
		const issue = result.error.issues.find((i) => i.path.join('.') === 'guardians.0.email');
		expect(issue?.message).toBe('A valid email is required.');
	});
});

describe('the guardian write DTO', () => {
	it('accepts a blank email rather than throwing mid-registration', () => {
		// This one runs inside `registerHouseholdCanonical`, after the guardian
		// has already pressed submit, so a throw here surfaces as an unhelpful
		// "Submission Error" toast with the registration lost.
		expect(GuardianWriteDto.safeParse(guardian('')).success).toBe(true);
	});

	it('still accepts an omitted email and a real one', () => {
		expect(GuardianWriteDto.safeParse(guardian(undefined)).success).toBe(true);
		expect(GuardianWriteDto.safeParse(guardian('alex@example.com')).success).toBe(true);
	});

	it('still rejects a malformed email', () => {
		const result = GuardianWriteDto.safeParse(guardian('alex-at-example'));
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues[0].message).toBe('Valid email is required');
	});
});
