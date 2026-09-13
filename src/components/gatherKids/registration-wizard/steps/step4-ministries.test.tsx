import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import type { RegistrationFormInput } from '../registration-schema';
import { defaultChildValues } from '../registration-schema';
import {
	MinistryCustomQuestionField,
	customQuestionFieldName,
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

	it('writes text answers to children[n].customData[questionId]', async () => {
		const user = userEvent.setup();
		const question: CustomQuestion = {
			id: 'experience-notes',
			text: 'Tell us about prior experience',
			type: 'text',
		};

		let getValuesRef: (() => RegistrationFormInput) | undefined;
		function Observer() {
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

			getValuesRef = methods.getValues;

			return (
				<Form {...methods}>
					<MinistryCustomQuestionField
						question={question}
						form={methods}
						childIndex={0}
					/>
				</Form>
			);
		}

		render(<Observer />);
		await user.type(
			screen.getByLabelText('Tell us about prior experience'),
			'Two years in choir'
		);

		expect(getValuesRef?.().children[0].customData).toEqual({
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
