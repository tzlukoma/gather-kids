/**
 * @jest-environment jsdom
 */

/**
 * #392 — Saving / Saved / error presentation for registration auto-save.
 */

import { render, screen } from '@testing-library/react';
import { DraftStatusIndicator } from '@/components/ui/draft-status-indicator';

describe('DraftStatusIndicator', () => {
	it('renders nothing before the first save', () => {
		const { container } = render(
			<DraftStatusIndicator isSaving={false} lastSaved={null} error={null} />
		);

		expect(container).toBeEmptyDOMElement();
	});

	it('shows Saving while a save is in flight', () => {
		render(<DraftStatusIndicator isSaving lastSaved={null} error={null} />);

		expect(screen.getByText('Saving...')).toBeInTheDocument();
	});

	it('shows how long ago the draft was saved', () => {
		render(
			<DraftStatusIndicator
				isSaving={false}
				lastSaved={new Date()}
				error={null}
			/>
		);

		expect(screen.getByText('Saved just now')).toBeInTheDocument();
	});

	it('reports an older save in minutes', () => {
		render(
			<DraftStatusIndicator
				isSaving={false}
				lastSaved={new Date(Date.now() - 5 * 60 * 1000)}
				error={null}
			/>
		);

		expect(screen.getByText('Saved 5m ago')).toBeInTheDocument();
	});

	it('shows the error and takes precedence over a prior successful save', () => {
		render(
			<DraftStatusIndicator
				isSaving={false}
				lastSaved={new Date()}
				error="Failed to save draft"
			/>
		);

		expect(screen.getByText('Error saving: Failed to save draft')).toBeInTheDocument();
		expect(screen.queryByText(/Saved just now/)).not.toBeInTheDocument();
	});

	it('shows the error while still saving, so a retry never hides a failure', () => {
		render(
			<DraftStatusIndicator isSaving lastSaved={null} error="Failed to save draft" />
		);

		expect(screen.getByText('Error saving: Failed to save draft')).toBeInTheDocument();
		expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
	});
});
