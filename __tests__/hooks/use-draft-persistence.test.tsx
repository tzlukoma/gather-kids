/**
 * @jest-environment jsdom
 */

/**
 * #392 — the draft toggle must be honoured for every operation, not just
 * writes. With persistence off the hook performs no adapter call at all, so
 * no draft can be read back into the UI.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';

const mockGetDraft = jest.fn();
const mockSaveDraft = jest.fn();
const mockClearDraft = jest.fn();

jest.mock('@/lib/dal', () => ({
	dbAdapter: {
		getDraft: (...args: unknown[]) => mockGetDraft(...args),
		saveDraft: (...args: unknown[]) => mockSaveDraft(...args),
		clearDraft: (...args: unknown[]) => mockClearDraft(...args),
	},
}));

let mockAuth: { user: { uid?: string } | null; loading: boolean } = {
	user: { uid: 'user-1' },
	loading: false,
};

jest.mock('@/contexts/auth-context', () => ({
	useAuth: () => mockAuth,
}));

type Draft = { household: { name: string } };

const DRAFT: Draft = { household: { name: 'Wakanda House' } };

function setup(enabled: boolean) {
	return renderHook(() =>
		useDraftPersistence<Draft>({
			formName: 'registration_v1',
			version: 1,
			autoSaveDelay: 0,
			enabled,
		})
	);
}

describe('useDraftPersistence', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuth = { user: { uid: 'user-1' }, loading: false };
		mockGetDraft.mockResolvedValue(DRAFT);
		mockSaveDraft.mockResolvedValue(undefined);
		mockClearDraft.mockResolvedValue(undefined);
	});

	describe('disabled', () => {
		it('reads nothing and never touches the adapter', async () => {
			const { result } = setup(false);

			await act(async () => {
				await expect(result.current.loadDraft()).resolves.toBeNull();
			});

			expect(mockGetDraft).not.toHaveBeenCalled();
		});

		it('writes nothing', async () => {
			const { result } = setup(false);

			await act(async () => {
				await result.current.saveDraft(DRAFT, true);
			});

			expect(mockSaveDraft).not.toHaveBeenCalled();
			expect(result.current.draftStatus.lastSaved).toBeNull();
		});

		it('clears nothing', async () => {
			const { result } = setup(false);

			await act(async () => {
				await result.current.clearDraft();
			});

			expect(mockClearDraft).not.toHaveBeenCalled();
		});
	});

	describe('enabled', () => {
		it('reads the stored draft', async () => {
			const { result } = setup(true);

			await act(async () => {
				await expect(result.current.loadDraft()).resolves.toEqual(DRAFT);
			});

			expect(mockGetDraft).toHaveBeenCalledWith('registration_v1', 'user-1');
		});

		it('writes the draft scoped to the form and user, and reports Saved', async () => {
			const { result } = setup(true);

			await act(async () => {
				await result.current.saveDraft(DRAFT, true);
			});

			expect(mockSaveDraft).toHaveBeenCalledWith(
				'registration_v1',
				'user-1',
				DRAFT,
				1
			);
			await waitFor(() => {
				expect(result.current.draftStatus.lastSaved).toBeInstanceOf(Date);
			});
			expect(result.current.draftStatus.isSaving).toBe(false);
			expect(result.current.draftStatus.error).toBeNull();
		});

		it('clears only this form for this user', async () => {
			const { result } = setup(true);

			await act(async () => {
				await result.current.clearDraft();
			});

			expect(mockClearDraft).toHaveBeenCalledWith('registration_v1', 'user-1');
		});

		it('surfaces a save failure without leaking form data', async () => {
			mockSaveDraft.mockRejectedValue(
				new Error('row rejected: {"household":{"name":"Wakanda House"}}')
			);
			const { result } = setup(true);

			await act(async () => {
				await result.current.saveDraft(DRAFT, true);
			});

			await waitFor(() => {
				expect(result.current.draftStatus.error).toBe('Failed to save draft');
			});
			// The adapter's message may echo the payload; the surfaced status must not.
			expect(result.current.draftStatus.error).not.toContain('Wakanda');
			expect(result.current.draftStatus.isSaving).toBe(false);
		});

		it('surfaces a load failure and resolves null', async () => {
			mockGetDraft.mockRejectedValue(new Error('boom'));
			const { result } = setup(true);

			await act(async () => {
				await expect(result.current.loadDraft()).resolves.toBeNull();
			});

			await waitFor(() => {
				expect(result.current.draftStatus.error).toBe('Failed to load draft');
			});
		});

		it('skips every adapter call while no user is authenticated', async () => {
			mockAuth = { user: null, loading: false };
			const { result } = setup(true);

			await act(async () => {
				await expect(result.current.loadDraft()).resolves.toBeNull();
				await result.current.saveDraft(DRAFT, true);
				await result.current.clearDraft();
			});

			expect(mockGetDraft).not.toHaveBeenCalled();
			expect(mockSaveDraft).not.toHaveBeenCalled();
			expect(mockClearDraft).not.toHaveBeenCalled();
		});
	});
});
