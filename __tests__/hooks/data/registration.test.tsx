import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useRegistrationCycles } from '@/hooks/data/registration';
import { getRegistrationCycles } from '@/lib/dal';

jest.unmock('@tanstack/react-query');

jest.mock('@/lib/dal', () => ({
	getRegistrationCycles: jest.fn(),
}));

const mockGetRegistrationCycles = getRegistrationCycles as jest.MockedFunction<
	typeof getRegistrationCycles
>;

const activeOnlyCycle = {
	cycle_id: 'cycle-active',
	name: 'Active Cycle',
	is_active: true,
	start_date: '2026-01-01',
	end_date: '2026-12-31',
	updated_at: '2026-01-01T00:00:00.000Z',
};

const allCycles = [
	activeOnlyCycle,
	{
		cycle_id: 'cycle-inactive',
		name: 'Inactive Cycle',
		is_active: false,
		start_date: '2025-01-01',
		end_date: '2025-12-31',
		updated_at: '2025-01-01T00:00:00.000Z',
	},
];

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	}

	return { queryClient, Wrapper };
}

describe('useRegistrationCycles', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetRegistrationCycles.mockImplementation((isActive) =>
			Promise.resolve(isActive ? [activeOnlyCycle] : allCycles),
		);
	});

	it('keeps useRegistrationCycles(true) and useRegistrationCycles() in separate cache entries when active is mounted first', async () => {
		const { Wrapper } = createWrapper();

		const activeFirst = renderHook(() => useRegistrationCycles(true), {
			wrapper: Wrapper,
		});
		await waitFor(() => expect(activeFirst.result.current.isSuccess).toBe(true));
		expect(activeFirst.result.current.data).toEqual([activeOnlyCycle]);
		expect(mockGetRegistrationCycles).toHaveBeenCalledWith(true);

		const allSecond = renderHook(() => useRegistrationCycles(), {
			wrapper: Wrapper,
		});
		await waitFor(() => expect(allSecond.result.current.isSuccess).toBe(true));
		expect(allSecond.result.current.data).toEqual(allCycles);
		expect(mockGetRegistrationCycles).toHaveBeenCalledWith(undefined);
	});

	it('keeps useRegistrationCycles(true) and useRegistrationCycles() in separate cache entries when default is mounted first', async () => {
		const { Wrapper } = createWrapper();

		const allFirst = renderHook(() => useRegistrationCycles(), {
			wrapper: Wrapper,
		});
		await waitFor(() => expect(allFirst.result.current.isSuccess).toBe(true));
		expect(allFirst.result.current.data).toEqual(allCycles);
		expect(mockGetRegistrationCycles).toHaveBeenCalledWith(undefined);

		const activeSecond = renderHook(() => useRegistrationCycles(true), {
			wrapper: Wrapper,
		});
		await waitFor(() => expect(activeSecond.result.current.isSuccess).toBe(true));
		expect(activeSecond.result.current.data).toEqual([activeOnlyCycle]);
		expect(mockGetRegistrationCycles).toHaveBeenCalledWith(true);
	});
});
