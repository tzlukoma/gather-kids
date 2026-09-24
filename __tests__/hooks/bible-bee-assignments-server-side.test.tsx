import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// The repo mocks react-query globally; these tests need the real one.
jest.unmock('@tanstack/react-query');

// Only the reads the hooks make, plus the one database call that creates
// missing rows. There is deliberately no `createStudentScripture` or
// `createStudentEssay` here: a family opening their own child's page may not
// write Bible Bee records (#527), so the hooks must never reach for them.
// Defined inside the factory: jest hoists `jest.mock` above the imports, and
// the SWC transform CI uses hoists the imports above any top-level const.
jest.mock('@/lib/dal', () => ({
	dbAdapter: {
		listEnrollments: jest.fn(),
		listScriptures: jest.fn(),
		listStudentScriptures: jest.fn(),
		listStudentEssays: jest.fn(),
		listEssayPrompts: jest.fn(),
		getHousehold: jest.fn(),
		ensureStudentAssignments: jest.fn(),
	},
	getChild: jest.fn(async () => ({ child_id: 'ch-1', household_id: 'hh-1' })),
	getBibleBeeCycles: jest.fn(async () => []),
}));
jest.mock('@/lib/bibleBee', () => ({
	toggleScriptureCompletion: jest.fn(),
	submitEssay: jest.fn(),
}));

import { useStudentAssignmentsQuery, useBibleBeeStats } from '@/hooks/data/bibleBee';

const mockAdapter = jest.requireMock('@/lib/dal').dbAdapter as Record<string, jest.Mock>;

const CYCLE = 'cycle-1';
const scripture = { id: 'sc-1', bible_bee_cycle_id: CYCLE, reference: 'John 3:16', text: 't', counts_for: 1 };
const promptA = { id: 'ep-a', bible_bee_cycle_id: CYCLE, division_id: 'div-1', title: 'A' };
const promptB = { id: 'ep-b', bible_bee_cycle_id: CYCLE, division_id: 'div-1', title: 'B' };

function wrapper({ children }: { children: React.ReactNode }) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('Bible Bee assignment rows come from the database, not the viewer', () => {
	let rowsExist: boolean;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => {});
		jest.spyOn(console, 'log').mockImplementation(() => {});
		rowsExist = false;
		mockAdapter.listEnrollments.mockResolvedValue([
			{ id: 'en-1', child_id: 'ch-1', bible_bee_cycle_id: CYCLE, division_id: 'div-1' },
		]);
		mockAdapter.listScriptures.mockResolvedValue([scripture]);
		mockAdapter.getHousehold.mockResolvedValue({ preferredScriptureTranslation: 'NIV' });
		// Unordered, as the real query is. The database chose prompt B.
		mockAdapter.listEssayPrompts.mockResolvedValue([promptA, promptB]);
		mockAdapter.ensureStudentAssignments.mockImplementation(async () => {
			rowsExist = true;
		});
		mockAdapter.listStudentScriptures.mockImplementation(async () =>
			rowsExist ? [{ id: 'ss-1', scripture_id: 'sc-1', is_completed: false }] : []
		);
		mockAdapter.listStudentEssays.mockImplementation(async () =>
			rowsExist
				? [{ id: 'se-1', child_id: 'ch-1', bible_bee_cycle_id: CYCLE, essay_prompt_id: 'ep-b', status: 'assigned' }]
				: []
		);
	});

	it('asks the database for the rows, then reads them', async () => {
		const { result } = renderHook(() => useStudentAssignmentsQuery('ch-1', CYCLE), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockAdapter.ensureStudentAssignments).toHaveBeenCalledWith('ch-1');
		expect(mockAdapter.ensureStudentAssignments.mock.invocationCallOrder[0]).toBeLessThan(
			mockAdapter.listStudentScriptures.mock.invocationCallOrder[0]
		);
		expect(result.current.data?.scriptures).toEqual([
			expect.objectContaining({ id: 'ss-1', scriptureId: 'sc-1', status: 'not_started' }),
		]);
		// The essay the database made is found whichever prompt it used.
		expect(result.current.data?.essays).toEqual([
			expect.objectContaining({ id: 'se-1', essay_prompt_id: 'ep-b', essayPrompt: promptB }),
		]);
	});

	it('the stats hook does the same', async () => {
		const { result } = renderHook(() => useBibleBeeStats('ch-1', CYCLE), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(mockAdapter.ensureStudentAssignments).toHaveBeenCalledWith('ch-1');
	});

	// The hook's existing error handling is unchanged: it logs and shows no
	// assignments. What matters here is that a missing row is never filled in
	// from the browser.
	it('shows nothing rather than writing when a row is still missing', async () => {
		mockAdapter.ensureStudentAssignments.mockResolvedValue(undefined);
		const { result } = renderHook(() => useStudentAssignmentsQuery('ch-1', CYCLE), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual({ scriptures: [], essays: [] });
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining('Error loading student assignments'),
			expect.objectContaining({ message: expect.stringContaining('after ensureStudentAssignments') })
		);
	});
});
