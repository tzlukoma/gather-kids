import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EssayCard, {
	EssayPromptDisplay,
} from '@/components/gatherKids/essay-card';

const richPrompt = {
	title: 'Names of God',
	prompt:
		'<p>Choose <strong>one name</strong> that resonates with you.</p><ul><li>Write a short prayer</li></ul>',
	instructions: '<p>Use only <em>100 Names of God</em> and the Bible.</p>',
	due_date: '2027-01-03T23:59:00',
};

describe('EssayPromptDisplay', () => {
	it('renders labeled Instructions, Prompt, and Due Date sections', () => {
		render(<EssayPromptDisplay {...richPrompt} showTitle />);

		expect(
			screen.getByRole('heading', { name: 'Names of God' })
		).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: 'Instructions' })
		).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: 'Prompt' })
		).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: 'Due Date' })
		).toBeInTheDocument();
		expect(screen.getByText('one name')).toBeInTheDocument();
		expect(screen.getByText('100 Names of God')).toBeInTheDocument();
		expect(screen.getByText('Write a short prayer')).toBeInTheDocument();
		expect(screen.getByText(/January 3, 2027/)).toBeInTheDocument();
	});

	it('omits the Instructions heading when instructions are empty', () => {
		render(
			<EssayPromptDisplay
				title="Essay"
				prompt="<p>Prompt only</p>"
				instructions="<p></p>"
				due_date="2027-01-03T23:59:00"
			/>
		);

		expect(
			screen.queryByRole('heading', { name: 'Instructions' })
		).not.toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: 'Prompt' })
		).toBeInTheDocument();
		expect(screen.getByText('Prompt only')).toBeInTheDocument();
	});

	it('renders legacy plain-text prompts without showing raw tags', () => {
		render(
			<EssayPromptDisplay prompt={'Line one\n\nLine two'} />
		);

		expect(screen.getByText('Line one')).toBeInTheDocument();
		expect(screen.getByText('Line two')).toBeInTheDocument();
	});

	it('does not execute or keep script tags from prompt HTML', () => {
		const { container } = render(
			<EssayPromptDisplay prompt="<p>Safe copy</p><script>alert(1)</script>" />
		);

		expect(container.querySelector('script')).toBeNull();
		expect(screen.getByText('Safe copy')).toBeInTheDocument();
	});
});

describe('EssayCard', () => {
	it('uses the essay title as the card heading and shows formatted sections', () => {
		render(<EssayCard essayPrompt={richPrompt} />);

		expect(
			screen.getByRole('heading', { name: 'Names of God' })
		).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: 'Instructions' })
		).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: 'Prompt' })
		).toBeInTheDocument();
		expect(screen.queryByText('Essay prompt for this division')).not.toBeInTheDocument();
	});
});
