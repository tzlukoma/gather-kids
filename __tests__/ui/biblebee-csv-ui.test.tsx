import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import YearManagePage from '@/app/dashboard/bible-bee/year/[id]/page';
import {
	renderWithAuth,
	mockUsers,
} from '../../src/test-utils/auth/test-utils';

// Mock next/navigation to provide useParams
jest.mock('next/navigation', () => ({
	useParams: () => ({ id: 'test-year' }),
}));

// papaparse is mocked via __mocks__/papaparse.ts

describe('Bible Bee CSV UI', () => {
	it('parses uploaded CSV and shows preview + commit button', async () => {
		const csv = `Reference,Text,Translation,sortOrder\nJohn 3:16,For God so loved the world,NIV,1\nLuke 2:11,For unto you is born this day,NIV,2\n`;
		// Render page as admin
		const { container } = renderWithAuth(<YearManagePage />, {
			user: mockUsers.admin,
			userRole: 'ADMIN',
		} as any);

		// find file input
		const fileInput = container.querySelector(
			'input[type="file"]'
		) as HTMLInputElement;
		expect(fileInput).toBeTruthy();

		const file = new File([csv], 'scriptures.csv', { type: 'text/csv' });

		// simulate file selection
		fireEvent.change(fileInput, { target: { files: [file] } });

		// wait for preview to appear
		await waitFor(() => {
			expect(screen.getByText('Preview (2 rows)')).toBeInTheDocument();
			expect(screen.getByText('John 3:16')).toBeInTheDocument();
			expect(screen.getByText('Luke 2:11')).toBeInTheDocument();
		});

		// Commit button should be present
		expect(screen.getByText('Commit to Year')).toBeInTheDocument();
	});
});
