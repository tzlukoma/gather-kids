import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * #587: marking a scripture moved the guardian page's headline by 1, then a
 * reload showed the stats query's figure, which weights each passage by
 * `counts_for` (Exodus 20:2-3 is scriptures #1-2). The optimistic update now
 * uses the same weight, so the figure does not change on reload.
 */

// The repo mocks react-query globally; these tests need the real one.
jest.unmock('@tanstack/react-query');

jest.mock('@/lib/dal', () => ({ dbAdapter: {}, getChild: jest.fn() }));
jest.mock('@/lib/bibleBee', () => ({
	// Never settles, so the optimistic figures are what the cache holds.
	toggleScriptureCompletion: jest.fn(() => new Promise(() => {})),
	submitEssay: jest.fn(),
}));

import { useToggleScriptureMutation } from '@/hooks/data/bibleBee';
import { queryKeys } from '@/hooks/data/keys';

const CHILD = 'child-synthetic-587';
const CYCLE = 'cycle-synthetic';
const assignmentsKey = [...queryKeys.studentAssignments(CHILD), CYCLE];
const statsKey = [...queryKeys.bibleBeeStats(CHILD), CYCLE];

function setup(statuses: Record<string, string>, completed: number) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	queryClient.setQueryData(assignmentsKey, {
		scriptures: [
			{ id: 'ex', status: statuses.ex, counts_for: 2, scripture: { reference: 'Exodus 20:2-3', counts_for: 2 } },
			{ id: 'lev', status: statuses.lev, counts_for: 1, scripture: { reference: 'Leviticus 20:26', counts_for: 1 } },
		],
		essays: [],
	});
	queryClient.setQueryData(statsKey, {
		bbStats: { requiredScriptures: 30, completedScriptures: completed, percentDone: 0, bonus: 0 },
	});
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useToggleScriptureMutation(CHILD, CYCLE), { wrapper });
	const completedNow = () =>
		(queryClient.getQueryData(statsKey) as { bbStats: { completedScriptures: number } }).bbStats
			.completedScriptures;
	return { result, queryClient, completedNow };
}

async function toggle(
	result: { current: ReturnType<typeof useToggleScriptureMutation> },
	id: string,
	complete: boolean
) {
	act(() => {
		result.current.mutate({ id, complete });
	});
}

describe('useToggleScriptureMutation optimistic count (#587)', () => {
	it('adds what the passage counts for: two for Exodus 20:2-3', async () => {
		const { result, completedNow } = setup({ ex: 'not_started', lev: 'not_started' }, 0);
		await toggle(result, 'ex', true);
		await waitFor(() => expect(completedNow()).toBe(2));
	});

	it('adds one for a single-verse passage', async () => {
		const { result, completedNow } = setup({ ex: 'completed', lev: 'not_started' }, 2);
		await toggle(result, 'lev', true);
		await waitFor(() => expect(completedNow()).toBe(3));
	});

	it('takes the same amount off when the passage is unmarked', async () => {
		const { result, completedNow } = setup({ ex: 'completed', lev: 'completed' }, 3);
		await toggle(result, 'ex', false);
		await waitFor(() => expect(completedNow()).toBe(1));
	});

	it('changes nothing when the passage is already in that state', async () => {
		const { result, queryClient, completedNow } = setup({ ex: 'completed', lev: 'not_started' }, 2);
		await toggle(result, 'ex', true);
		await waitFor(() =>
			expect(
				(queryClient.getQueryData(assignmentsKey) as { scriptures: { status: string }[] })
					.scriptures[0].status
			).toBe('completed')
		);
		expect(completedNow()).toBe(2);
	});
});
