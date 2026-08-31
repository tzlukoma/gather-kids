import { exportEmergencySnapshotCSV } from '@/lib/dal';
import { db as dbAdapter } from '@/lib/database/factory';

jest.mock('@/lib/database/factory', () => ({
	db: {
		listAttendance: jest.fn(),
		listChildren: jest.fn(),
		listAllGuardians: jest.fn(),
		listAllEmergencyContacts: jest.fn(),
	},
}));

const mockAdapter = dbAdapter as unknown as {
	listAttendance: jest.Mock;
	listChildren: jest.Mock;
	listAllGuardians: jest.Mock;
	listAllEmergencyContacts: jest.Mock;
};

async function blobToText(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ''));
		reader.onerror = () => reject(reader.error);
		reader.readAsText(blob);
	});
}

describe('exportEmergencySnapshotCSV', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('includes checked-in children with guardian and emergency phones', async () => {
		mockAdapter.listAttendance.mockResolvedValue([
			{ child_id: 'c1', date: '2026-08-30', check_out_at: null },
		]);
		mockAdapter.listChildren.mockResolvedValue([
			{
				child_id: 'c1',
				household_id: 'h1',
				first_name: 'Ada',
				last_name: 'Lovelace',
				dob: '2018-01-01',
				grade: '2nd',
				allergies: 'None',
				medical_notes: '',
				is_active: true,
			},
		]);
		mockAdapter.listAllGuardians.mockResolvedValue([
			{
				household_id: 'h1',
				first_name: 'Annabella',
				last_name: 'Lovelace',
				is_primary: true,
				mobile_phone: '5551234567',
			},
		]);
		mockAdapter.listAllEmergencyContacts.mockResolvedValue([
			{
				household_id: 'h1',
				first_name: 'Mary',
				last_name: 'Byron',
				mobile_phone: '5559876543',
			},
		]);

		const blob = await exportEmergencySnapshotCSV('2026-08-30');
		const text = await blobToText(blob);
		expect(text).toContain('Ada Lovelace');
		expect(text).toContain('Annabella Lovelace');
		expect(text).toContain('Mary Byron');
	});

	it('returns an empty snapshot when nobody is checked in', async () => {
		mockAdapter.listAttendance.mockResolvedValue([]);
		mockAdapter.listChildren.mockResolvedValue([]);
		mockAdapter.listAllGuardians.mockResolvedValue([]);
		mockAdapter.listAllEmergencyContacts.mockResolvedValue([]);

		const blob = await exportEmergencySnapshotCSV('2026-08-30');
		const text = await blobToText(blob);
		expect(text.replace(/^\uFEFF/, '')).toBe('');
	});
});
