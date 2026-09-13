import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import type { RegistrationFormInput } from '../registration-schema';
import { defaultChildValues } from '../registration-schema';
import {
	MinistryCustomQuestionField,
	customQuestionFieldName,
	findDuplicateCustomQuestionConflictsForChildren,
	findDuplicateCustomQuestionIds,
} from './step4-ministries';
import type { CustomQuestion } from '@/lib/types';


function Step4FormHarness({
	question,
	childIndex = 0,
	defaultCustomData = {},
}: {
	question: CustomQuestion;
	childIndex?: number;
	defaultCustomData?: Record<string, unknown>;
}) {
	const methods = useForm<RegistrationFormInput>({
		defaultValues: {
			household: {
				address_line1: '',
				city: '',
				state: '',
				zip: '',
			},
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
			children: [
				{
					...defaultChildValues,
					first_name: 'Jordan',
					customData: defaultCustomData,
				},
			],
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
				<MinistryCustomQuestionField
					question={question}
					form={methods}
					childIndex={childIndex}
				/>
			</form>
		</Form>
	);
}

describe('step4 custom question field paths', () => {
	it('uses flat customData keyed by question id', () => {
		expect(customQuestionFieldName(0, 'shirt-size')).toBe(
			'children.0.customData.shirt-size'
		);
		expect(customQuestionFieldName(1, 'experience-notes')).toBe(
			'children.1.customData.experience-notes'
		);
	});

	it('detects duplicate question ids across ministries', () => {
		const dups = findDuplicateCustomQuestionIds([
			{
				code: 'choir',
				name: 'Choir',
				custom_questions: [{ id: 'experience-notes', text: 'A', type: 'text' }],
			},
			{
				code: 'orators',
				name: 'Orators',
				custom_questions: [
					{ id: 'experience-notes', text: 'B', type: 'text' },
					{ id: 'shirt-size', text: 'Size', type: 'text' },
				],
			},
		]);
		expect(dups).toEqual([
			{
				questionId: 'experience-notes',
				ministryLabels: ['Choir', 'Orators'],
			},
		]);
	});

	it('returns no duplicates when question ids are unique', () => {
		expect(
			findDuplicateCustomQuestionIds([
				{
					code: 'a',
					name: 'A',
					custom_questions: [{ id: 'q1', text: 'One', type: 'text' }],
				},
				{
					code: 'b',
					name: 'B',
					custom_questions: [{ id: 'q2', text: 'Two', type: 'text' }],
				},
			])
		).toEqual([]);
	});

	it('blocks Step 4 readiness while a child has colliding selected ministries', () => {
		const ministries = [
			{
				code: 'choir',
				name: 'Choir',
				custom_questions: [{ id: 'experience-notes', text: 'A', type: 'text' as const }],
			},
			{
				code: 'orators',
				name: 'Orators',
				custom_questions: [
					{ id: 'experience-notes', text: 'B', type: 'text' as const },
				],
			},
		];

		expect(
			findDuplicateCustomQuestionConflictsForChildren(
				[
					{
						ministrySelections: { choir: true, orators: true },
					},
				],
				ministries
			)
		).toHaveLength(1);

		expect(
			findDuplicateCustomQuestionConflictsForChildren(
				[
					{
						ministrySelections: { choir: true, orators: false },
					},
				],
				ministries
			)
		).toEqual([]);
	});

	it('writes text answers to children[n].customData[questionId]', async () => {
		const user = userEvent.setup();
		const question: CustomQuestion = {
			id: 'experience-notes',
			text: 'Tell us about prior experience',
			type: 'text',
		};
		const capturedValues: RegistrationFormInput[] = [];

		function Observer({
			onCapture,
		}: {
			onCapture: (values: RegistrationFormInput) => void;
		}) {
			const methods = useForm<RegistrationFormInput>({
				defaultValues: {
					household: {
						address_line1: '',
						city: '',
						state: '',
						zip: '',
					},
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
					children: [{ ...defaultChildValues, customData: {} }],
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
					<MinistryCustomQuestionField
						question={question}
						form={methods}
						childIndex={0}
					/>
					<button type="button" onClick={() => onCapture(methods.getValues())}>
						Capture values
					</button>
				</Form>
			);
		}

		render(<Observer onCapture={(values) => capturedValues.push(values)} />);
		await user.type(
			screen.getByLabelText('Tell us about prior experience'),
			'Two years in choir'
		);
		await user.click(screen.getByRole('button', { name: 'Capture values' }));

		expect(capturedValues.at(-1)?.children[0].customData).toEqual({
			'experience-notes': 'Two years in choir',
		});
	});

	it('restores prefilled customData into the control', () => {
		render(
			<Step4FormHarness
				question={{
					id: 'shirt-size',
					text: 'Shirt size',
					type: 'text',
				}}
				defaultCustomData={{ 'shirt-size': 'Youth M' }}
			/>
		);

		expect(screen.getByLabelText('Shirt size')).toHaveValue('Youth M');
	});

	it('keeps answers isolated per child index', () => {
		expect(customQuestionFieldName(0, 'notes')).not.toBe(
			customQuestionFieldName(1, 'notes')
		);
	});
});

const COLLIDING_MINISTRIES = [
	{
		code: 'choir',
		name: 'Choir',
		custom_questions: [
			{ id: 'experience-notes', text: 'A', type: 'text' as const },
		],
	},
	{
		code: 'orators',
		name: 'Orators',
		custom_questions: [
			{ id: 'experience-notes', text: 'B', type: 'text' as const },
		],
	},
];

/**
 * Mirrors RegisterWizard Step 4 CTA: watch form values and block Save & continue
 * while selected ministries share a custom-question id.
 */
function Step4AdvanceHarness({
	initialSelections,
}: {
	initialSelections: Record<string, boolean>;
}) {
	const form = useForm<RegistrationFormInput>({
		defaultValues: {
			household: {
				address_line1: '1 Test St',
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
					...defaultChildValues,
					first_name: 'Jordan',
					ministrySelections: initialSelections,
				},
			],
			consents: {
				liability: false,
				photoRelease: false,
				group_consents: {},
				custom_consents: {},
			},
		},
	});

	const watchedValues = form.watch();
	const canProceed =
		findDuplicateCustomQuestionConflictsForChildren(
			watchedValues.children ?? [],
			COLLIDING_MINISTRIES
		).length === 0;

	return (
		<Form {...form}>
			<form>
				<label>
					<input
						type="checkbox"
						checked={Boolean(watchedValues.children[0]?.ministrySelections?.choir)}
						onChange={(event) =>
							form.setValue(
								'children.0.ministrySelections.choir',
								event.target.checked,
								{ shouldDirty: true }
							)
						}
					/>
					Choir
				</label>
				<label>
					<input
						type="checkbox"
						checked={Boolean(
							watchedValues.children[0]?.ministrySelections?.orators
						)}
						onChange={(event) =>
							form.setValue(
								'children.0.ministrySelections.orators',
								event.target.checked,
								{ shouldDirty: true }
							)
						}
					/>
					Orators
				</label>
				<Button type="button" disabled={!canProceed}>
					Save & continue
				</Button>
			</form>
		</Form>
	);
}

describe('Step 4 duplicate custom-question advance guard', () => {
	it('keeps Save & continue disabled until the collision is cleared', async () => {
		const user = userEvent.setup();
		render(
			<Step4AdvanceHarness
				initialSelections={{ choir: true, orators: true }}
			/>
		);

		const cta = screen.getByRole('button', { name: /save & continue/i });
		expect(cta).toBeDisabled();

		await user.click(screen.getByLabelText('Orators'));

		await waitFor(() => {
			expect(cta).toBeEnabled();
		});
	});
});
