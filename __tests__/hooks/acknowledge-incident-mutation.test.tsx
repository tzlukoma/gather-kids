/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useAcknowledgeIncident } from '@/hooks/data/attendance';
import { queryKeys } from '@/hooks/data/keys';

jest.unmock('@tanstack/react-query');

jest.mock('@/lib/dal', () => ({
	acknowledgeIncident: jest.fn().mockResolvedValue(1),
	getServiceDayIso: () => '2026-09-16',
}));

import { acknowledgeIncident } from '@/lib/dal';

const mockAcknowledgeIncident = acknowledgeIncident as jest.MockedFunction<
	typeof acknowledgeIncident
>;

describe('useAcknowledgeIncident', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAcknowledgeIncident.mockResolvedValue(1);
	});

	it('invalidates both the incidents log and the dashboard pending list', async () => {
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

		const { result } = renderHook(() => useAcknowledgeIncident(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync('incident-1');
		});

		expect(mockAcknowledgeIncident).toHaveBeenCalledWith(
			'incident-1',
			expect.anything()
		);
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['incidents'] });
		// Dashboard KPI + table read from a separate key; without this the
		// acknowledged row stayed on screen until a manual reload.
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: queryKeys.unacknowledgedIncidents(),
		});
	});
});
