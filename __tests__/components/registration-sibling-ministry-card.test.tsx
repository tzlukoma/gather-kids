import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiblingMinistryCard } from '@/components/gatherKids/registration-wizard/sibling-ministry-card';
import type { SiblingMinistryStatus } from '@/components/gatherKids/registration-wizard/sibling-ministry-status';

/**
 * The Review / jump / resume state machine from the signed spec.
 *
 * Reviewing is a way of looking, not an edit — nothing about the form changes —
 * so "resumes without data loss" is a property of the design rather than
 * something to assert after the fact. What is worth pinning is that the control
 * is not a one-way door: a parent who opens Review must be able to get back to
 * the whole list, and to move between siblings without passing through it.
 */

const statuses: SiblingMinistryStatus[] = [
	{
		childIndex: 0,
		childId: 'c-amara',
		name: 'Amara',
		ministryLabels: ['Joy Bells', 'Sunday School'],
		firstMinistryCode: 'choir-joy',
	},
	{
		childIndex: 1,
		childId: 'c-kofi',
		name: 'Kofi',
		ministryLabels: ['Acolytes'],
		firstMinistryCode: 'min-acolyte',
	},
];

function Harness({ list = statuses }: { list?: SiblingMinistryStatus[] }) {
	const [reviewing, setReviewing] = useState(-1);
	return (
		<SiblingMinistryCard
			statuses={list}
			reviewingChildIndex={reviewing}
			onReview={(status) =>
				setReviewing((current) =>
					current === status.childIndex ? -1 : status.childIndex
				)
			}
			onStopReviewing={() => setReviewing(-1)}
		/>
	);
}

const reviewButtons = () => screen.getAllByRole('button', { name: /^review$/i });

describe('SiblingMinistryCard', () => {
	it('renders nothing when no sibling has saved choices', () => {
		const { container } = render(<Harness list={[]} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('names each sibling and what they kept', () => {
		render(<Harness />);
		expect(
			screen.getByText(/Amara's ministries already saved/)
		).toBeInTheDocument();
		expect(screen.getByText('Joy Bells and Sunday School')).toBeInTheDocument();
		expect(screen.getByText(/Kofi's ministries already saved/)).toBeInTheDocument();
		expect(screen.getByText('Acolytes')).toBeInTheDocument();
	});

	it('says nothing is under review until Review is pressed', () => {
		render(<Harness />);
		expect(screen.queryByText(/Reviewing/)).not.toBeInTheDocument();
		for (const button of reviewButtons()) {
			expect(button).toHaveAttribute('aria-pressed', 'false');
		}
	});

	it('enters review for the child whose button was pressed', async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.click(reviewButtons()[0]);

		expect(screen.getByText(/Reviewing Amara's ministries/)).toBeInTheDocument();
		expect(reviewButtons()[0]).toHaveAttribute('aria-pressed', 'true');
		expect(reviewButtons()[1]).toHaveAttribute('aria-pressed', 'false');
	});

	it('resumes when Done reviewing is pressed', async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.click(reviewButtons()[0]);
		await user.click(screen.getByRole('button', { name: /done reviewing/i }));

		expect(screen.queryByText(/Reviewing/)).not.toBeInTheDocument();
		expect(reviewButtons()[0]).toHaveAttribute('aria-pressed', 'false');
	});

	it('toggles off when the same child is reviewed twice', async () => {
		// Not a one-way door: the same button that opened it closes it.
		const user = userEvent.setup();
		render(<Harness />);

		await user.click(reviewButtons()[0]);
		await user.click(reviewButtons()[0]);

		expect(screen.queryByText(/Reviewing/)).not.toBeInTheDocument();
	});

	it('moves straight to another sibling', async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.click(reviewButtons()[0]);
		await user.click(reviewButtons()[1]);

		expect(screen.getByText(/Reviewing Kofi's ministries/)).toBeInTheDocument();
		expect(screen.queryByText(/Reviewing Amara/)).not.toBeInTheDocument();
		expect(reviewButtons()[0]).toHaveAttribute('aria-pressed', 'false');
		expect(reviewButtons()[1]).toHaveAttribute('aria-pressed', 'true');
	});

	it('announces the change rather than only colouring it', async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.click(reviewButtons()[0]);

		// The highlight down the page is invisible to a screen reader, so the
		// banner carries the same information as text.
		expect(screen.getByRole('status')).toHaveTextContent(
			/Reviewing Amara's ministries/
		);
	});
});
