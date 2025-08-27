import React from 'react';
import { renderWithAuth, mockUsers } from '@/test-utils/auth/test-utils';
import { screen, waitFor, fireEvent } from '@testing-library/react';
// Mock next/navigation useParams to return our test childId before importing the page
jest.mock('next/navigation', () => ({
	useParams: () => ({ childId: 'test-child' }),
}));

const ChildBibleBeePage =
	require('@/app/household/children/[childId]/bible-bee/page').default;
import { db } from '@/lib/db';

describe('Child Bible Bee UI', () => {
	beforeEach(async () => {
		// Clear DB stores used by the page (support real Dexie or in-memory mock)
		if (typeof db.competitionYears.clear === 'function') {
			await db.competitionYears.clear();
		} else if ((db.competitionYears as any)?._internalStore) {
			(db.competitionYears as any)._internalStore.clear();
		}
		if (typeof db.scriptures.clear === 'function') {
			await db.scriptures.clear();
		} else if ((db.scriptures as any)?._internalStore) {
			(db.scriptures as any)._internalStore.clear();
		}
		if (typeof db.studentScriptures.clear === 'function') {
			await db.studentScriptures.clear();
		} else if ((db.studentScriptures as any)?._internalStore) {
			(db.studentScriptures as any)._internalStore.clear();
		}
		if (typeof db.studentEssays.clear === 'function') {
			await db.studentEssays.clear();
		} else if ((db.studentEssays as any)?._internalStore) {
			(db.studentEssays as any)._internalStore.clear();
		}

		const yearObj = {
			id: crypto.randomUUID(),
			year: 2025,
			name: '2025',
			description: '',
			opensAt: undefined,
			closesAt: undefined,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as any;
		const yearId = await db.competitionYears.add(yearObj);
		const scriptureObj = {
			id: crypto.randomUUID(),
			competitionYearId: yearId,
			reference: 'John 3:16',
			text: 'For God so loved...',
			sortOrder: 1,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as any;
		const scriptureId = await db.scriptures.add(scriptureObj);
		const studentScriptureObj = {
			id: crypto.randomUUID(),
			childId: 'test-child',
			scriptureId,
			competitionYearId: yearId,
			status: 'assigned',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as any;
		await db.studentScriptures.add(studentScriptureObj);
	});

	it('shows assigned scripture and updates immediately when toggled', async () => {
		renderWithAuth(<ChildBibleBeePage />, {
			user: mockUsers.guardian,
			userRole: 'GUARDIAN',
		});

		// wait for scripture card to appear
		await waitFor(() =>
			expect(screen.getByText(/John 3:16/)).toBeInTheDocument()
		);

		// find the mark-completed button (component renders a button with aria-label)
		const toggleBtn = screen.getByRole('button', { name: /Mark completed/i });
		expect(toggleBtn).toBeInTheDocument();
		expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');

		// toggle
		fireEvent.click(toggleBtn);

		// optimistic update should mark it completed immediately (aria-pressed -> true)
		await waitFor(() =>
			expect(toggleBtn.getAttribute('aria-pressed')).toBe('true')
		);
	});
});
