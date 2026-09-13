import * as Sentry from '@sentry/nextjs';
import {
	buildConditionalConsentContext,
	childHasChoirSelection,
	pruneStaleConsents,
	resetMisconfiguredConsentWarningsForTests,
	shouldShowChoirGroupConsent,
} from './consent-context';
import { childHasChoirEnrollment } from './registration-schema';
import type { RegistrationFormInput } from './registration-schema';
import type { Ministry, MinistryGroup } from '@/lib/types';

jest.mock('@sentry/nextjs', () => ({
	captureMessage: jest.fn(),
}));

const captureMessage = Sentry.captureMessage as jest.MockedFunction<
	typeof Sentry.captureMessage
>;

const baseForm: RegistrationFormInput = {
	household: {
		address_line1: '123 Main St',
		city: 'Perth Amboy',
		state: 'NJ',
		zip: '08861',
	},
	guardians: [
		{
			first_name: 'Alex',
			last_name: 'Rivera',
			mobile_phone: '5551234567',
			relationship: 'Parent',
			is_primary: true,
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
			first_name: 'Jordan',
			last_name: 'Rivera',
			dob: '2015-05-15',
			grade: '3rd',
			ministrySelections: { 'teen-choir': true },
			interestSelections: { orators: true },
			customFields: {},
		},
	],
	consents: {
		liability: true,
		photoRelease: true,
		group_consents: { choirs: 'yes' },
		custom_consents: { orators: true, dance: true },
	},
};

const choirsGroup: MinistryGroup = {
	id: 'group-choirs',
	code: 'choirs',
	name: 'Choirs',
	custom_consent_required: true,
	custom_consent_text: 'Planning Center consent',
	created_at: '2026-01-01T00:00:00.000Z',
	updated_at: '2026-01-01T00:00:00.000Z',
};

const teenChoir: Ministry = {
	ministry_id: 'teen-choir-id',
	code: 'teen-choir',
	name: 'Teen Choir',
	enrollment_type: 'enrolled',
	data_profile: 'Basic',
	is_active: true,
	created_at: '2026-01-01T00:00:00.000Z',
	updated_at: '2026-01-01T00:00:00.000Z',
};

const orators: Ministry = {
	ministry_id: 'orators-id',
	code: 'orators',
	name: 'Orators',
	enrollment_type: 'expressed_interest',
	data_profile: 'Basic',
	is_active: true,
	optional_consent_text: 'Orators terms',
	created_at: '2026-01-01T00:00:00.000Z',
	updated_at: '2026-01-01T00:00:00.000Z',
};

describe('consent-context', () => {
	beforeEach(() => {
		resetMisconfiguredConsentWarningsForTests();
		captureMessage.mockClear();
	});

	it('does not require or show choir consent when choir ministry codes are unknown', () => {
		const children = baseForm.children;

		expect(
			childHasChoirEnrollment(children, [])
		).toBe(false);
		expect(childHasChoirSelection(children, [])).toBe(false);
		expect(
			shouldShowChoirGroupConsent({
				children,
				ministryGroups: [choirsGroup],
				choirMinistries: [],
			})
		).toBe(false);

		const context = buildConditionalConsentContext({
			allMinistries: [orators],
			ministryGroups: [choirsGroup],
			choirMinistries: [],
		});

		expect(context.groupConsentRules[0]?.isRequired(baseForm)).toBe(false);
	});

	it('warns once when choirs requires consent but no choir ministries resolve', () => {
		buildConditionalConsentContext({
			allMinistries: [orators],
			ministryGroups: [choirsGroup],
			choirMinistries: [],
		});
		buildConditionalConsentContext({
			allMinistries: [orators],
			ministryGroups: [choirsGroup],
			choirMinistries: [],
		});

		expect(captureMessage).toHaveBeenCalledTimes(1);
		expect(captureMessage).toHaveBeenCalledWith(
			'Ministry group requires consent but resolved no ministries',
			{
				level: 'warning',
				tags: { ministry_group_code: 'choirs' },
				extra: {
					groupCode: 'choirs',
					resolvedMinistryCount: 0,
				},
			}
		);
	});

	it('does not warn when choir ministries resolve for a consent-requiring choirs group', () => {
		buildConditionalConsentContext({
			allMinistries: [orators],
			ministryGroups: [choirsGroup],
			choirMinistries: [teenChoir],
		});

		expect(captureMessage).not.toHaveBeenCalled();
	});

	it('does not warn when the choirs group is not configured for consent', () => {
		buildConditionalConsentContext({
			allMinistries: [orators],
			ministryGroups: [],
			choirMinistries: [],
		});

		expect(captureMessage).not.toHaveBeenCalled();
	});

	it('does not show choir consent when the choirs group is not configured', () => {
		expect(
			shouldShowChoirGroupConsent({
				children: baseForm.children,
				ministryGroups: [],
				choirMinistries: [teenChoir],
			})
		).toBe(false);
	});

	it('builds custom consent codes only from ministries with optional_consent_text', () => {
		const context = buildConditionalConsentContext({
			allMinistries: [orators, { ...orators, code: 'no-text', optional_consent_text: undefined }],
			ministryGroups: [choirsGroup],
			choirMinistries: [teenChoir],
		});

		expect(context.customConsentMinistryCodes).toEqual(['orators']);
	});

	it('prunes stale consents when a child is removed', () => {
		const context = buildConditionalConsentContext({
			allMinistries: [orators],
			ministryGroups: [choirsGroup],
			choirMinistries: [teenChoir],
		});

		const withoutChild = {
			...baseForm,
			children: [],
		};

		const pruned = pruneStaleConsents(baseForm.consents, withoutChild, context);
		expect(pruned.group_consents).toEqual({});
		expect(pruned.custom_consents).toEqual({});
	});

	it('prunes deselected ministry consents', () => {
		const context = buildConditionalConsentContext({
			allMinistries: [orators],
			ministryGroups: [choirsGroup],
			choirMinistries: [teenChoir],
		});

		const deselected = {
			...baseForm,
			children: [
				{
					...baseForm.children[0],
					ministrySelections: {},
					interestSelections: {},
				},
			],
		};

		const pruned = pruneStaleConsents(baseForm.consents, deselected, context);
		expect(pruned.group_consents).toEqual({});
		expect(pruned.custom_consents).toEqual({});
	});
});
