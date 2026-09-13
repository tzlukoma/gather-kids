import { registrationSchema } from '@/components/gatherKids/registration-wizard/registration-schema';
import {
	allergyFieldsFor,
	assertDisposableRegistrationEnv,
	buildBaseConsents,
	buildBibleBeeMinistry,
	buildChild,
	buildChildEligibleForMinistry,
	buildChildIneligibleOlderForMinistry,
	buildChildIneligibleYoungerForMinistry,
	buildChildren,
	buildChoirMinistry,
	buildChoirsGroupConsent,
	buildConsentsWithChoirAndOrators,
	buildCustomQuestion,
	buildGuardians,
	buildMinistryWithCustomQuestions,
	buildMinimalRegistrationForm,
	buildMultiMemberRegistrationForm,
	buildOratorsMinistry,
	buildRegistrationFormInput,
	ageOnIso,
	dobForAge,
	isAgeEligible,
	isDisposableRegistrationSupabaseUrl,
	isDobEligibleForMinistry,
	resetSyntheticIdSequence,
	withBibleBeeSelected,
	withChoirGroupConsent,
	withCustomMinistryConsent,
	withInterestSelection,
	withMinistryEnrollment,
} from './index';

describe('registration fixtures', () => {
	beforeEach(() => {
		resetSyntheticIdSequence();
	});

	describe('guardians / children / form shapes', () => {
		it('builds guardians with primary then secondary flags', () => {
			const guardians = buildGuardians(2);
			expect(guardians).toHaveLength(2);
			expect(guardians[0]).toMatchObject({
				is_primary: true,
				first_name: 'Alex',
				email: expect.stringContaining('@example.test'),
			});
			expect(guardians[1]).toMatchObject({
				is_primary: false,
				first_name: 'Blair',
			});
		});

		it('builds allergy variants with expected fields', () => {
			expect(allergyFieldsFor('none')).toMatchObject({
				allergies: '',
				special_needs: false,
			});
			expect(allergyFieldsFor('details').allergies).toMatch(/Peanuts/);
			expect(allergyFieldsFor('special_needs')).toMatchObject({
				special_needs: true,
				special_needs_notes: expect.stringMatching(/quiet space/),
			});
			expect(
				buildChild({ allergyVariant: 'allergies_and_special_needs' })
			).toMatchObject({
				allergies: expect.stringMatching(/Dairy/),
				special_needs: true,
			});
		});

		it('builds a registration form that passes the wizard schema', () => {
			const form = buildMinimalRegistrationForm();
			expect(form.guardians).toHaveLength(1);
			expect(form.children).toHaveLength(1);
			expect(form.consents).toMatchObject({
				liability: true,
				photoRelease: true,
			});
			const parsed = registrationSchema.safeParse(form);
			expect(parsed.success).toBe(true);
		});

		it('builds multi-member forms with requested counts', () => {
			const form = buildMultiMemberRegistrationForm(2, 3);
			expect(form.guardians).toHaveLength(2);
			expect(form.children).toHaveLength(3);
			expect(buildChildren(1)).toHaveLength(1);
		});
	});

	describe('ministries / consents / custom questions', () => {
		it('builds ministries with custom questions and choir group consent', () => {
			const ministry = buildMinistryWithCustomQuestions();
			expect(ministry.custom_questions).toHaveLength(3);
			expect(ministry.custom_questions?.[0]?.type).toBe('radio');
			expect(buildCustomQuestion({ id: 'x' }).id).toBe('x');

			const orators = buildOratorsMinistry();
			expect(orators.code).toBe('orators');
			expect(orators.optional_consent_text).toMatch(/Synthetic Orators/);

			const bibleBee = buildBibleBeeMinistry();
			expect(bibleBee.enrollment_type).toBe('expressed_interest');

			const choir = buildChoirMinistry();
			expect(choir.code).toBe('teen_choir');

			const group = buildChoirsGroupConsent();
			expect(group.code).toBe('choirs');
			expect(group.custom_consent_required).toBe(true);
		});

		it('composes consent helpers for choir and custom ministries', () => {
			const base = buildBaseConsents();
			expect(withChoirGroupConsent(base, 'yes').group_consents?.choirs).toBe(
				'yes'
			);
			expect(
				withCustomMinistryConsent(base, 'orators', true).custom_consents
					?.orators
			).toBe(true);

			const combined = buildConsentsWithChoirAndOrators('no');
			expect(combined.group_consents?.choirs).toBe('no');
			expect(combined.custom_consents?.orators).toBe(true);
		});

		it('attaches ministry / bible bee selections onto children', () => {
			const child = withBibleBeeSelected(
				withInterestSelection(
					withMinistryEnrollment(buildChild(), 'teen_choir', true),
					'orators',
					true
				),
				true
			);
			expect(child.ministrySelections?.teen_choir).toBe(true);
			expect(child.interestSelections?.orators).toBe(true);
			expect(child.interestSelections?.bible_bee).toBe(true);
		});
	});

	describe('eligible / ineligible age helpers', () => {
		const range = { min_age: 5, max_age: 10 };

		it('produces DOBs that land on the requested age', () => {
			expect(dobForAge(8, '2026-09-12')).toBe('2018-09-12');
		});

		it('builds eligible and ineligible children for a ministry range', () => {
			const asOfIso = '2026-09-12';
			const eligible = buildChildEligibleForMinistry(range, { asOfIso });
			expect(isDobEligibleForMinistry(eligible.dob, range, asOfIso)).toBe(
				true
			);
			expect(isAgeEligible(ageOnIso(eligible.dob, asOfIso), range)).toBe(true);

			const younger = buildChildIneligibleYoungerForMinistry(range, {
				asOfIso,
			});
			expect(younger.dob).toBe(dobForAge(4, asOfIso));
			expect(isDobEligibleForMinistry(younger.dob, range, asOfIso)).toBe(
				false
			);

			const older = buildChildIneligibleOlderForMinistry(range, { asOfIso });
			expect(older.dob).toBe(dobForAge(11, asOfIso));
			expect(isDobEligibleForMinistry(older.dob, range, asOfIso)).toBe(false);
		});
	});

	describe('env safety', () => {
		it('allows localhost disposable URLs only', () => {
			expect(
				isDisposableRegistrationSupabaseUrl('http://127.0.0.1:54321')
			).toBe(true);
			expect(
				isDisposableRegistrationSupabaseUrl('http://localhost:54321')
			).toBe(true);
			expect(
				isDisposableRegistrationSupabaseUrl(
					'https://gekouvbeujfkiaorshim.supabase.co'
				)
			).toBe(false);
			expect(
				isDisposableRegistrationSupabaseUrl(
					'https://loekqsjtvvuuigxwavyq.supabase.co'
				)
			).toBe(false);
			expect(
				isDisposableRegistrationSupabaseUrl('https://other.supabase.co')
			).toBe(false);
		});

		it('assertDisposableRegistrationEnv throws for UAT/production', () => {
			expect(() =>
				assertDisposableRegistrationEnv({
					SUPABASE_URL: 'https://loekqsjtvvuuigxwavyq.supabase.co',
				})
			).toThrow(/refuse non-disposable/);

			expect(() =>
				assertDisposableRegistrationEnv({
					SUPABASE_URL: 'http://127.0.0.1:54321',
				})
			).not.toThrow();
		});
	});

	describe('override composition', () => {
		it('merges household and consent overrides without dropping required keys', () => {
			const form = buildRegistrationFormInput({
				overrides: {
					household: { address_line1: '200 Override Ave' },
					consents: {
						liability: true,
						photoRelease: true,
						group_consents: { choirs: 'yes' },
					},
				},
			});
			expect(form.household.address_line1).toBe('200 Override Ave');
			expect(form.household.city).toBe('Perth Amboy');
			expect(form.consents.group_consents?.choirs).toBe('yes');
			expect(registrationSchema.safeParse(form).success).toBe(true);
		});
	});
});
