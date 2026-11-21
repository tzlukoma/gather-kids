import React from 'react';
import { render } from '@testing-library/react';
import { Progress } from '@/components/ui/progress';

describe('Progress', () => {
	it('uses a muted track so 0% reads as empty, not full', () => {
		const { container } = render(<Progress value={0} />);
		const track = container.firstElementChild as HTMLElement;
		expect(track).toHaveClass('bg-muted');
		expect(track).not.toHaveClass('bg-secondary');
	});

	it('fills the indicator to the given value', () => {
		const { container } = render(<Progress value={40} />);
		const indicator = container.firstElementChild?.firstElementChild as HTMLElement;
		expect(indicator).toHaveClass('bg-primary');
		expect(indicator.style.transform).toBe('translateX(-60%)');
	});
});
