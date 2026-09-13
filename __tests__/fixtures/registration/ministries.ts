import type { CustomQuestion, Ministry } from '@/lib/types';
import { syntheticId } from './ids';

export type MinistryFixture = Pick<
	Ministry,
	| 'ministry_id'
	| 'name'
	| 'code'
	| 'enrollment_type'
	| 'min_age'
	| 'max_age'
	| 'min_grade'
	| 'max_grade'
	| 'data_profile'
	| 'custom_questions'
	| 'optional_consent_text'
	| 'is_active'
	| 'description'
>;

export function buildCustomQuestion(
	overrides: Partial<CustomQuestion> = {}
): CustomQuestion {
	return {
		id: syntheticId('cq'),
		text: 'Synthetic custom question?',
		type: 'text',
		...overrides,
	};
}

export function buildRadioCustomQuestion(
	overrides: Partial<CustomQuestion> = {}
): CustomQuestion {
	return buildCustomQuestion({
		text: 'Preferred rehearsal day? (synthetic)',
		type: 'radio',
		options: ['Monday', 'Wednesday', 'Saturday'],
		...overrides,
	});
}

export function buildCheckboxCustomQuestion(
	overrides: Partial<CustomQuestion> = {}
): CustomQuestion {
	return buildCustomQuestion({
		text: 'Which synthetic events can you attend?',
		type: 'checkbox',
		options: ['Fall kickoff', 'Spring showcase'],
		...overrides,
	});
}

export function buildMinistry(
	overrides: Partial<MinistryFixture> = {}
): MinistryFixture {
	const code = overrides.code ?? 'synthetic_ministry';
	return {
		ministry_id: overrides.ministry_id ?? syntheticId('min'),
		name: overrides.name ?? 'Synthetic Ministry',
		code,
		enrollment_type: overrides.enrollment_type ?? 'enrolled',
		min_age: overrides.min_age ?? 5,
		max_age: overrides.max_age ?? 12,
		data_profile: overrides.data_profile ?? 'SafetyAware',
		custom_questions: overrides.custom_questions ?? [],
		optional_consent_text: overrides.optional_consent_text,
		is_active: overrides.is_active ?? true,
		description: overrides.description ?? 'Synthetic ministry for registration fixtures',
		min_grade: overrides.min_grade,
		max_grade: overrides.max_grade,
	};
}

export function buildSundaySchoolMinistry(
	overrides: Partial<MinistryFixture> = {}
): MinistryFixture {
	return buildMinistry({
		ministry_id: 'min_sunday_school',
		code: 'min_sunday_school',
		name: 'Sunday School',
		enrollment_type: 'enrolled',
		min_age: 3,
		max_age: 18,
		...overrides,
	});
}

export function buildBibleBeeMinistry(
	overrides: Partial<MinistryFixture> = {}
): MinistryFixture {
	return buildMinistry({
		ministry_id: 'min_bible_bee',
		code: 'bible_bee',
		name: 'Bible Bee',
		enrollment_type: 'expressed_interest',
		min_age: 5,
		max_age: 18,
		...overrides,
	});
}

export function buildChoirMinistry(
	overrides: Partial<MinistryFixture> = {}
): MinistryFixture {
	return buildMinistry({
		ministry_id: 'min_teen_choir',
		code: 'teen_choir',
		name: 'Teen Choir',
		enrollment_type: 'enrolled',
		min_age: 11,
		max_age: 18,
		...overrides,
	});
}

/** Orators-style expressed-interest ministry with optional consent text. */
export function buildOratorsMinistry(
	overrides: Partial<MinistryFixture> = {}
): MinistryFixture {
	return buildMinistry({
		ministry_id: 'min_orators',
		code: 'orators',
		name: 'Orators',
		enrollment_type: 'expressed_interest',
		min_age: 8,
		max_age: 18,
		optional_consent_text:
			'Synthetic Orators consent: I understand performance expectations.',
		custom_questions: [
			buildRadioCustomQuestion({
				id: 'orators_experience',
				text: 'Prior speaking experience? (synthetic)',
			}),
		],
		...overrides,
	});
}

export function buildMinistryWithCustomQuestions(
	overrides: Partial<MinistryFixture> = {}
): MinistryFixture {
	return buildMinistry({
		code: 'custom_q_ministry',
		name: 'Custom Questions Ministry',
		custom_questions: [
			buildRadioCustomQuestion({ id: 'cq_radio' }),
			buildCheckboxCustomQuestion({ id: 'cq_check' }),
			buildCustomQuestion({ id: 'cq_text', type: 'text', text: 'Anything else?' }),
		],
		...overrides,
	});
}

export type MinistryGroupConsentFixture = {
	id: string;
	code: string;
	name: string;
	custom_consent_text: string;
	custom_consent_required: boolean;
};

export function buildChoirsGroupConsent(
	overrides: Partial<MinistryGroupConsentFixture> = {}
): MinistryGroupConsentFixture {
	return {
		id: 'grp_choirs',
		code: 'choirs',
		name: 'Choirs',
		custom_consent_text:
			'Synthetic choir group consent: photos and performances may be shared within the ministry.',
		custom_consent_required: true,
		...overrides,
	};
}
