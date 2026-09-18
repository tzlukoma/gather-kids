import React from 'react';
import { render, screen, within } from '@testing-library/react';
import type { RegisteredChildReceipt } from '@/lib/types';
import { RegistrationDone } from './registration-done';

/**
 * #400: this screen was built from the form the guardian submitted, so it
 * announced ministries that persistence had declined to enrol the child in, and
 * it presented an expression of interest as a confirmed place.
 */

jest.mock('next/navigation', () => ({
	useRouter: () => ({ push: jest.fn() }),
}));

const SUNDAY_SCHOOL = {
	ministry_id: 'min_sunday_school',
	ministry_name: 'Sunday School',
	ministry_code: 'min_sunday_school',
	status: 'enrolled' as const,
};

function receipt(overrides: Partial<RegisteredChildReceipt>): RegisteredChildReceipt {
	return {
		child_id: 'child-1',
		first_name: 'Sky',
		last_name: 'Rivera',
		enrollments: [SUNDAY_SCHOOL],
		...overrides,
	};
}

/** The block of the summary card belonging to one child. */
function summaryFor(name: string): HTMLElement {
	return screen.getByText(name).closest('div') as HTMLElement;
}

describe('RegistrationDone', () => {
	it('lists exactly the enrollments that were persisted', () => {
		render(
			<RegistrationDone
				registeredChildren={[
					receipt({
						enrollments: [
							SUNDAY_SCHOOL,
							{
								ministry_id: 'min_choir',
								ministry_name: 'Joy Bells Choir',
								ministry_code: 'joy-bells',
								status: 'enrolled',
							},
						],
					}),
				]}
			/>
		);

		const summary = summaryFor('Sky Rivera');
		expect(within(summary).getByText('Sunday School')).toBeInTheDocument();
		expect(within(summary).getByText('Joy Bells Choir')).toBeInTheDocument();
	});

	it('does not announce a ministry that was not persisted', () => {
		// The guardian ticked Joy Bells for a child too young for it; the DAL
		// declined, so it must not appear here.
		render(<RegistrationDone registeredChildren={[receipt({ first_name: 'Robin' })]} />);

		expect(screen.queryByText('Joy Bells Choir')).not.toBeInTheDocument();
		expect(within(summaryFor('Robin Rivera')).getByText('Sunday School')).toBeInTheDocument();
	});

	it('separates expressed interest from confirmed enrollment', () => {
		render(
			<RegistrationDone
				registeredChildren={[
					receipt({
						enrollments: [
							SUNDAY_SCHOOL,
							{
								ministry_id: 'min_mentoring',
								ministry_name: 'Youth Mentoring',
								ministry_code: 'mentoring',
								status: 'expressed_interest',
							},
						],
					}),
				]}
			/>
		);

		expect(screen.getByText(/Interest noted — not yet registered/)).toBeInTheDocument();

		// The interest must not be sitting in the confirmed list beside
		// Sunday School, which is what made it read as an enrollment.
		const confirmedHeading = screen.getByText('Confirmed Registration');
		const interestLabel = screen.getByText(/Interest noted/);
		const mentoring = screen.getByText('Youth Mentoring');
		expect(interestLabel.compareDocumentPosition(mentoring)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
		expect(confirmedHeading).toBeInTheDocument();
	});

	it('shows each sibling their own enrollments', () => {
		render(
			<RegistrationDone
				registeredChildren={[
					receipt({
						child_id: 'child-sky',
						first_name: 'Sky',
						enrollments: [
							SUNDAY_SCHOOL,
							{
								ministry_id: 'min_choir',
								ministry_name: 'Joy Bells Choir',
								ministry_code: 'joy-bells',
								status: 'enrolled',
							},
						],
					}),
					receipt({ child_id: 'child-robin', first_name: 'Robin' }),
				]}
			/>
		);

		expect(within(summaryFor('Sky Rivera')).getByText('Joy Bells Choir')).toBeInTheDocument();
		expect(
			within(summaryFor('Robin Rivera')).queryByText('Joy Bells Choir')
		).not.toBeInTheDocument();
	});

	it('offers the Bible Bee panel only when a child was actually enrolled', () => {
		const { rerender } = render(
			<RegistrationDone registeredChildren={[receipt({})]} childrenEnrolledInBibleBee={false} />
		);
		expect(screen.queryByText('Bible Bee Enrollment')).not.toBeInTheDocument();

		rerender(
			<RegistrationDone registeredChildren={[receipt({})]} childrenEnrolledInBibleBee={true} />
		);
		expect(screen.getByText('Bible Bee Enrollment')).toBeInTheDocument();
	});
});
