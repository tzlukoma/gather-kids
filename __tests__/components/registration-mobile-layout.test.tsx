import React from 'react';
import { render } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Step1Household } from '@/components/gatherKids/registration-wizard/steps/step1-household';
import { Step2Guardians } from '@/components/gatherKids/registration-wizard/steps/step2-guardians';
import { Step3Children } from '@/components/gatherKids/registration-wizard/steps/step3-children';
import {
	defaultChildValues,
	registrationSchema,
} from '@/components/gatherKids/registration-wizard/registration-schema';
import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';

/**
 * #390 — the responsive contract, as classes.
 *
 * jsdom has no layout, so it cannot tell you a row overflowed; the E2E probe
 * in `e2e/gathersystem-registration-mobile-layout.spec.ts` measures that with a
 * real engine. What jsdom *can* protect is the rule, so that someone tidying
 * class lists later does not quietly restore `grid-cols-2` and put the bug
 * back without a browser present to notice.
 *
 * So these assert the specific decisions, and say why each one is load-bearing.
 */

function buildValues(): RegistrationFormInput {
	return {
		household: {
			name: '',
			address_line1: '123 Main St',
			address_line2: '',
			city: 'Perth Amboy',
			state: 'NJ',
			zip: '08861',
			preferredScriptureTranslation: 'NIV',
		},
		guardians: [
			{
				first_name: 'Ada',
				last_name: 'Okoye',
				mobile_phone: '5551234567',
				email: '',
				relationship: 'Mother',
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
				...defaultChildValues,
				first_name: 'Amara',
				last_name: 'Okoye',
				dob: '2015-04-02',
				grade: '4',
				allergies: 'None',
			},
			{
				...defaultChildValues,
				first_name: 'Kofi',
				last_name: 'Okoye',
				dob: '2019-06-11',
				grade: '1',
				allergies: 'None',
			},
		] as RegistrationFormInput['children'],
		consents: {
			liability: true,
			photoRelease: true,
			group_consents: {},
			custom_consents: {},
		},
	};
}

function Harness({ step }: { step: 1 | 2 | 3 }) {
	const form = useForm<RegistrationFormInput>({
		resolver: zodResolver(registrationSchema),
		defaultValues: buildValues(),
	});

	return (
		<Form {...form}>
			<form>
				{step === 1 && <Step1Household form={form} />}
				{step === 2 && <Step2Guardians form={form} blockedAt={0} />}
				{step === 3 && <Step3Children form={form} blockedAt={0} />}
			</form>
		</Form>
	);
}

const renderStep = (step: 1 | 2 | 3) => render(<Harness step={step} />).container;

describe('two-column field groups stack on a phone', () => {
	// The legacy form used `grid-cols-1 md:grid-cols-2`. The wizard dropped the
	// base case, so first name and last name shared a line at 320px.
	it.each([[1], [2], [3]])('step %i has no unconditional grid-cols-2', (step) => {
		const container = renderStep(step as 1 | 2 | 3);
		const grids = Array.from(container.querySelectorAll('.grid'));
		expect(grids.length).toBeGreaterThan(0);

		for (const grid of grids) {
			const cls = grid.className;
			if (!cls.includes('grid-cols-2')) continue;
			// A two-column group is allowed, but only from md up.
			expect(cls).toContain('md:grid-cols-2');
			expect(cls).toContain('grid-cols-1');
			expect(cls).not.toMatch(/(^|\s)grid-cols-2(\s|$)/);
		}
	});
});

describe('guardian summary card', () => {
	it('wraps rather than squeezing Edit and Delete off the row', () => {
		const container = renderStep(2);
		const row = container.querySelector('.justify-between.flex-wrap, .flex-wrap.justify-between');
		expect(row).not.toBeNull();
		expect(row!.className).toContain('flex-wrap');
	});

	it('lets the identity block shrink', () => {
		// Without `min-w-0` a flex child refuses to go narrower than its own
		// content, so a long name pushes the actions out instead of wrapping.
		// This is the part that looks redundant and is not.
		const container = renderStep(2);
		expect(container.querySelectorAll('.min-w-0').length).toBeGreaterThan(0);
	});

	it('gives the card actions a 44px target on phones', () => {
		const container = renderStep(2);
		const edit = Array.from(container.querySelectorAll('button')).find((b) =>
			/edit/i.test(b.textContent || '')
		);
		expect(edit).toBeDefined();
		expect(edit!.className).toContain('min-h-11');
		// …and back to the compact size where a pointer is doing the work.
		expect(edit!.className).toContain('md:min-h-9');
	});
});

describe('child navigation header', () => {
	it('wraps, so a long name cannot push Previous/Next off the row', () => {
		const container = renderStep(3);
		const heading = container.querySelector('h2');
		expect(heading).not.toBeNull();
		const row = heading!.closest('.flex-wrap');
		expect(row).not.toBeNull();
		expect(row!.className).toContain('justify-between');
	});

	it('gives Previous and Next a 44px target on phones', () => {
		const container = renderStep(3);
		for (const name of [/previous/i, /next/i]) {
			const button = Array.from(container.querySelectorAll('button')).find((b) =>
				name.test(b.textContent || '')
			);
			expect(button).toBeDefined();
			expect(button!.className).toContain('min-h-11');
		}
	});

	it('lets a long child name break instead of widening the row', () => {
		const container = renderStep(3);
		expect(container.querySelector('h2')!.className).toContain('break-words');
	});
});
