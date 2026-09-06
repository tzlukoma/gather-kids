/**
 * @jest-environment jsdom
 *
 * MAINT-18: Shared Dialog is Radix-based (FocusScope + Escape + focus return).
 * This contract test locks Escape-to-close; full focus-trap behavior is
 * provided by @radix-ui/react-dialog / FocusScope (verified in dependency).
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

describe('Dialog focus contract (MAINT-18)', () => {
	it('closes on Escape via onOpenChange(false)', async () => {
		const user = userEvent.setup();
		const onOpenChange = jest.fn();

		render(
			<Dialog open onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Focus trap dialog</DialogTitle>
						<DialogDescription>
							Verifies Escape closes the shared Dialog.
						</DialogDescription>
					</DialogHeader>
					<button type="button">First focusable</button>
				</DialogContent>
			</Dialog>
		);

		expect(
			screen.getByRole('dialog', { name: 'Focus trap dialog' })
		).toBeInTheDocument();

		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	it('exposes dialog role when open (Radix content)', () => {
		render(
			<Dialog open onOpenChange={() => undefined}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Open dialog</DialogTitle>
						<DialogDescription>Visible for a11y.</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		);

		expect(screen.getByRole('dialog', { name: 'Open dialog' })).toBeInTheDocument();
	});
});
