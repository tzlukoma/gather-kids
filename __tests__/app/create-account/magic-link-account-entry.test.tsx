import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSignInWithOtp = jest.fn();

jest.mock('@/lib/supabaseClient', () => ({
	supabase: {
		auth: {
			signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
		},
	},
}));

jest.mock('@/lib/analytics/browser', () => ({
	captureAnalyticsEvent: jest.fn(),
}));

import MagicLinkAccountEntry from '@/app/create-account/magic-link-account-entry';

const clearMarker = () => {
	document.cookie = 'gk_account_entry_flow=; Path=/; Max-Age=0';
};

const submit = (email: string) => {
	fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
	fireEvent.click(screen.getByRole('button', { name: 'Email me a secure link' }));
};

describe('MagicLinkAccountEntry', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		clearMarker();
	});

	// /auth/callback exchanges a PKCE code with the verifier this browser stored
	// when it asked for the link, so the request must not go through the server.
	it('requests the link from the browser client with the path-only callback', async () => {
		mockSignInWithOtp.mockResolvedValue({ error: null });
		const fetchSpy = jest.fn();
		global.fetch = fetchSpy;
		render(<MagicLinkAccountEntry />);

		submit('parent@example.com');

		await screen.findByRole('heading', { name: 'Check your email' });
		expect(mockSignInWithOtp).toHaveBeenCalledWith({
			email: 'parent@example.com',
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`,
				shouldCreateUser: true,
			},
		});
		expect(fetchSpy).not.toHaveBeenCalled();
		delete (global as { fetch?: unknown }).fetch;
	});

	it('shows the generic error and sets no marker when Supabase refuses', async () => {
		mockSignInWithOtp.mockResolvedValue({ error: { message: 'rate limited' } });
		render(<MagicLinkAccountEntry />);

		submit('parent@example.com');

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'We could not send a secure link. Please try again.'
		);
		await waitFor(() => expect(mockSignInWithOtp).toHaveBeenCalledTimes(1));
		expect(document.cookie).not.toContain('gk_account_entry_flow');
	});
});
