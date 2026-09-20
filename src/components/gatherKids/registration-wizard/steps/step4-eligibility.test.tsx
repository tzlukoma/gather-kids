import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import type { Ministry } from '@/lib/types';
import type { RegistrationFormInput } from '../registration-schema';
import { defaultChildValues } from '../registration-schema';
import {
	Step4Ministries,
	hasAnyEligibleChild,
	partitionChildrenByEligibility,
	staleSelectionFieldPaths,
} from './step4-ministries';

/**
 * #400: step 4 offered every ministry to every child regardless of age or
 * enrollment window. Persistence then dropped the ineligible selections without
 * saying so, and the confirmation screen reported them as enrollments anyway.
 */

jest.mock('@/lib/dal', () => ({
	getMinistries: jest.fn(),
	getMinistriesByGroupCode: jest.fn(),
}));

const { getMinistries, getMinistriesByGroupCode } = jest.requireMock('@/lib/dal');

const TODAY = new Date('2026-09-18T17:00:00.000Z');

function ministry(overrides: Partial<Ministry>): Ministry {
	return {
		ministry_id: overrides.code ?? 'min',
		name: 'Ministry',
		code: 'ministry',
		enrollment_type: 'enrolled',
		data_profile: 'Basic',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		...overrides,
	} as Ministry;
}

/** Ages 8–12. */
const CHOIR = ministry({
	ministry_id: 'min_choir',
	code: 'joy-bells',
	name: 'Joy Bells Choir',
	min_age: 8,
	max_age: 12,
});

/** Any age, but its window shut last month. */
const CLOSED = ministry({
	ministry_id: 'min_camp',
	code: 'summer-camp',
	name: 'Summer Camp',
	open_at: '2026-05-01',
	close_at: '2026-08-31',
});

/** Any age, always open. */
const OPEN_TO_ALL = ministry({
	ministry_id: 'min_ushers',
	code: 'junior-ushers',
	name: 'Junior Ushers',
});

const INTEREST = ministry({
	ministry_id: 'min_mentoring',
	code: 'mentoring',
	name: 'Youth Mentoring',
	enrollment_type: 'expressed_interest',
	min_age: 13,
	max_age: 18,
});

// Ten on the day under test — inside the choir, outside the mentoring range.
const SKY = { first_name: 'Sky', dob: '2016-03-02' };
// Four — too young for the choir.
const ROBIN = { first_name: 'Robin', dob: '2022-03-02' };

describe('partitionChildrenByEligibility', () => {
	it('keeps each child at their original form index', () => {
		const { eligible, ineligible } = partitionChildrenByEligibility(
			CHOIR,
			[ROBIN, SKY],
			TODAY
		);

		// The index is the checkbox's field path, so it must survive the split.
		expect(eligible.map((e) => e.childIndex)).toEqual([1]);
		expect(ineligible.map((e) => e.childIndex)).toEqual([0]);
	});

	it('carries the reason each ineligible child was set aside', () => {
		const { ineligible } = partitionChildrenByEligibility(CHOIR, [ROBIN], TODAY);
		expect(ineligible[0].eligibility.reason).toBe('too_young');
	});

	it('sets a child aside when the window is shut, whatever their age', () => {
		const { eligible, ineligible } = partitionChildrenByEligibility(
			CLOSED,
			[SKY, ROBIN],
			TODAY
		);
		expect(eligible).toHaveLength(0);
		expect(ineligible.map((e) => e.eligibility.reason)).toEqual(['closed', 'closed']);
	});
});

describe('hasAnyEligibleChild', () => {
	it('is true when one sibling qualifies and the other does not', () => {
		expect(hasAnyEligibleChild(CHOIR, [SKY, ROBIN], TODAY)).toBe(true);
	});

	it('is false when no child in the household qualifies', () => {
		expect(hasAnyEligibleChild(CHOIR, [ROBIN], TODAY)).toBe(false);
		expect(hasAnyEligibleChild(CLOSED, [SKY, ROBIN], TODAY)).toBe(false);
	});
});

describe('staleSelectionFieldPaths', () => {
	const byCode = new Map([
		[CHOIR.code, CHOIR],
		[INTEREST.code, INTEREST],
	]);

	it('finds a selection left checked after a birth date was corrected', () => {
		const children = [
			{ ...ROBIN, ministrySelections: { 'joy-bells': true } },
		];
		expect(staleSelectionFieldPaths(children, byCode, TODAY)).toEqual([
			'children.0.ministrySelections.joy-bells',
		]);
	});

	it('leaves a selection the child is still eligible for alone', () => {
		const children = [{ ...SKY, ministrySelections: { 'joy-bells': true } }];
		expect(staleSelectionFieldPaths(children, byCode, TODAY)).toEqual([]);
	});

	it('covers interest selections too', () => {
		const children = [{ ...SKY, interestSelections: { mentoring: true } }];
		expect(staleSelectionFieldPaths(children, byCode, TODAY)).toEqual([
			'children.0.interestSelections.mentoring',
		]);
	});

	it('ignores an unchecked box and an unknown ministry code', () => {
		const children = [
			{
				...ROBIN,
				ministrySelections: { 'joy-bells': false, 'not-a-ministry': true },
			},
		];
		expect(staleSelectionFieldPaths(children, byCode, TODAY)).toEqual([]);
	});
});

function Harness({ childRecords }: { childRecords: Array<Record<string, unknown>> }) {
	const methods = useForm<RegistrationFormInput>({
		defaultValues: {
			household: { address_line1: '', city: '', state: '', zip: '' },
			guardians: [
				{
					first_name: '',
					last_name: '',
					mobile_phone: '',
					relationship: 'Parent',
					is_primary: true,
				},
			],
			emergencyContact: {
				first_name: '',
				last_name: '',
				mobile_phone: '',
				relationship: '',
			},
			children: childRecords.map((child) => ({ ...defaultChildValues, ...child })) as any,
			consents: {
				liability: false,
				photoRelease: false,
				group_consents: {},
				custom_consents: {},
			},
		},
	});

	return (
		<Form {...methods}>
			<form>
				<Step4Ministries form={methods} />
			</form>
		</Form>
	);
}

/**
 * The repo's manual `@tanstack/react-query` mock resolves its queries in a
 * floating promise, so the ministry lists land after render returns. Flushing
 * inside `act` keeps that state update accounted for instead of leaving React
 * to warn about it on every assertion.
 */
async function renderStep4(children: Array<Record<string, unknown>>) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	const result = render(
		<QueryClientProvider client={client}>
			<Harness childRecords={children} />
		</QueryClientProvider>
	);
	await act(async () => {
		await Promise.resolve();
	});
	return result;
}

/**
 * The checkbox labels rendered under one ministry's heading.
 *
 * Read from the DOM rather than by clicking: this repo's jsdom cannot drive
 * Radix checkboxes, and what matters here is which children are offered at all.
 */
function childrenOfferedFor(ministryName: string): string[] {
	const heading = screen.getByText(ministryName);
	const card = heading.closest('div.border-2, div.border-t') as HTMLElement;
	return Array.from(card.querySelectorAll('label')).map((el) =>
		(el.textContent ?? '').trim()
	);
}

describe('Step4Ministries eligibility', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers({ doNotFake: ['queueMicrotask'] }).setSystemTime(TODAY);
		getMinistriesByGroupCode.mockResolvedValue([]);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('offers a ministry only to the sibling old enough for it', async () => {
		getMinistries.mockResolvedValue([CHOIR, OPEN_TO_ALL]);

		await renderStep4([SKY, ROBIN]);

		expect(await screen.findByText('Joy Bells Choir')).toBeInTheDocument();
		expect(childrenOfferedFor('Joy Bells Choir')).toEqual(['Sky']);

		// A ministry with no age bounds still offers both.
		expect(childrenOfferedFor('Junior Ushers')).toEqual(['Sky', 'Robin']);
	});

	it('names the sibling who cannot join, with the reason', async () => {
		getMinistries.mockResolvedValue([CHOIR]);

		await renderStep4([SKY, ROBIN]);

		expect(await screen.findByText('Joy Bells Choir')).toBeInTheDocument();
		expect(screen.getByText(/Robin — Opens at age 8/)).toBeInTheDocument();
	});

	it('hides a ministry no child in the household can join', async () => {
		getMinistries.mockResolvedValue([CHOIR, OPEN_TO_ALL]);

		await renderStep4([ROBIN]);

		expect(await screen.findByText('Junior Ushers')).toBeInTheDocument();
		expect(screen.queryByText('Joy Bells Choir')).not.toBeInTheDocument();
	});

	it('hides a ministry whose enrollment window has closed', async () => {
		getMinistries.mockResolvedValue([CLOSED, OPEN_TO_ALL]);

		await renderStep4([SKY]);

		expect(await screen.findByText('Junior Ushers')).toBeInTheDocument();
		expect(screen.queryByText('Summer Camp')).not.toBeInTheDocument();
	});

	it('applies the same rule to expressed-interest activities', async () => {
		getMinistries.mockResolvedValue([OPEN_TO_ALL, INTEREST]);

		await renderStep4([SKY]);

		// Sky is 10; mentoring opens at 13.
		expect(await screen.findByText('Junior Ushers')).toBeInTheDocument();
		expect(screen.queryByText('Youth Mentoring')).not.toBeInTheDocument();
	});
});
