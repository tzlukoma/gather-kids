/**
 * Regression test for #454.
 *
 * src/lib/hooks/useData.ts used to export two dead check-in mutations that were
 * superseded by the live hooks in src/hooks/data/attendance.ts. This test
 * guards against them being re-introduced.
 */
import * as useDataModule from '@/lib/hooks/useData';

describe('useData module exports', () => {
	it('does not export the dead useCheckInMutation from #454', () => {
		expect(useDataModule).not.toHaveProperty('useCheckInMutation');
	});

	it('does not export the dead useCheckOutMutation from #454', () => {
		expect(useDataModule).not.toHaveProperty('useCheckOutMutation');
	});
});
