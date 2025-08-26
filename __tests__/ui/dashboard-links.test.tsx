import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';
import { renderWithAuth, mockUsers } from '@/test-utils/auth/test-utils';

jest.mock('@/lib/db', () => ({
	db: {
		incidents: { filter: () => ({ toArray: async () => [] }) },
		attendance: { where: () => ({ filter: () => ({ count: async () => 0 }) }) },
		registrations: { where: () => ({ toArray: async () => [] }) },
		children: { where: () => ({ toArray: async () => [] }) },
	},
}));

describe('Admin dashboard links', () => {
	test('Checked-In Children card links to check-in page with filter', async () => {
		renderWithAuth(<DashboardPage />, { user: mockUsers.admin });

		// find the card title and then its anchor parent
		const title = await screen.findByText('Checked-In Children');
		expect(title).toBeInTheDocument();

		// anchor is the closest ancestor <a>
		let el: HTMLElement | null = title;
		while (el && el.tagName !== 'A') el = el.parentElement;
		expect(el).not.toBeNull();
		const href = (el as HTMLAnchorElement).getAttribute('href');
		expect(href).toBe('/dashboard/check-in?filter=checkedIn');
	});
});
