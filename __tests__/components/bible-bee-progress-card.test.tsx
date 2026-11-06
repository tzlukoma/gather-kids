import React from 'react';
import { render, screen } from '@testing-library/react';
import { BibleBeeProgressCard } from '@/components/gatherKids/bible-bee-progress-card';

jest.mock('@/contexts/auth-context', () => ({
	useAuth: () => ({ userRole: 'GUARDIAN' }),
}));
jest.mock('@/hooks/data', () => ({ useChild: jest.fn() }));
jest.mock('@/components/ui/progress', () => ({
	Progress: ({ value }: { value: number }) => (
		<div data-testid="progress" data-value={value} />
	),
}));

describe('BibleBeeProgressCard', () => {
	it('caps progress at 100% and shows extra scriptures as a bonus', () => {
		render(
			<BibleBeeProgressCard
				childId="child-1"
				childName="Sophia Johnson"
				completedScriptures={4}
				requiredScriptures={3}
			/>
		);

		expect(screen.getByText('100%')).toBeInTheDocument();
		expect(screen.queryByText('133%')).not.toBeInTheDocument();
		expect(screen.getByText(/3\/3/)).toHaveTextContent('3/3 · +1 bonus');
		expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '100');
	});

	it('shows plain progress when the requirement is not yet met', () => {
		render(
			<BibleBeeProgressCard
				childId="child-2"
				childName="Noah Johnson"
				completedScriptures={1}
				requiredScriptures={3}
			/>
		);

		expect(screen.getByText('33%')).toBeInTheDocument();
		expect(screen.getByText('1/3')).toBeInTheDocument();
		expect(screen.queryByText(/bonus/)).not.toBeInTheDocument();
	});
});
