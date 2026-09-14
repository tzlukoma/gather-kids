/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useUpdateChildPhotoMutation } from '@/hooks/data/children';
import { queryKeys } from '@/hooks/data/keys';

jest.unmock('@tanstack/react-query');

jest.mock('@/lib/dal', () => ({
	updateChildPhoto: jest.fn().mockResolvedValue('child-1'),
}));

import { updateChildPhoto } from '@/lib/dal';

const mockUpdateChildPhoto = updateChildPhoto as jest.MockedFunction<
	typeof updateChildPhoto
>;

describe('useUpdateChildPhotoMutation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUpdateChildPhoto.mockResolvedValue('child-1');
	});

	it('invalidates the household profile for the child household', async () => {
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		const { result } = renderHook(() => useUpdateChildPhotoMutation(), {
			wrapper,
		});

		await act(async () => {
			await result.current.mutateAsync({
				childId: 'child-1',
				photoDataUrl: 'data:image/jpeg;base64,abc',
				householdId: 'hh-1',
			});
		});

		expect(mockUpdateChildPhoto).toHaveBeenCalledWith(
			'child-1',
			'data:image/jpeg;base64,abc'
		);
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: queryKeys.householdProfile('hh-1'),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: queryKeys.children(),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: queryKeys.child('child-1'),
		});
	});

	it('falls back to householdProfile prefix when householdId is omitted', async () => {
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		const { result } = renderHook(() => useUpdateChildPhotoMutation(), {
			wrapper,
		});

		await act(async () => {
			await result.current.mutateAsync({
				childId: 'child-1',
				photoDataUrl: 'data:image/jpeg;base64,abc',
			});
		});

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ['householdProfile'],
		});
	});
});
