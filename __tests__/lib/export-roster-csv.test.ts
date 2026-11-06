import { exportRosterCSV } from '@/lib/dal';

async function blobToText(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ''));
		reader.onerror = () => reject(reader.error);
		reader.readAsText(blob);
	});
}

/** #566: the roster CSV's `event` column names the event, not its id. */
describe('exportRosterCSV event column', () => {
	const rows = [
		{ first_name: 'Jordan', last_name: 'Kim', activeAttendance: { event_id: 'evt_teen_church', check_in_at: '2026-11-08T15:00:00Z' } },
		{ first_name: 'Amara', last_name: 'Bennett', activeAttendance: null },
	];

	/** The cells of one named column, one per data row. */
	function column(csv: string, name: string): string[] {
		const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
		const header = lines[0].split(',').map((h) => h.replace(/"/g, ''));
		const index = header.indexOf(name);
		expect(index).toBeGreaterThanOrEqual(0);
		return lines.slice(1).map((line) => line.split(',')[index].replace(/"/g, ''));
	}
	const eventColumn = (csv: string) => column(csv, 'event');

	it('uses the current event name when the caller provides names', async () => {
		const csv = await blobToText(
			await exportRosterCSV(rows, {
				eventName: (id) => (id === 'evt_teen_church' ? 'Youth Service' : ''),
			})
		);
		expect(eventColumn(csv)).toEqual(['Youth Service', 'N/A']);
	});

	it('falls back to the event id without names', async () => {
		const csv = await blobToText(await exportRosterCSV(rows));
		expect(eventColumn(csv)).toEqual(['evt_teen_church', 'N/A']);
	});

	it('keeps the stable id in an event_id column next to the name', async () => {
		const csv = await blobToText(
			await exportRosterCSV(rows, {
				eventName: (id) => (id === 'evt_teen_church' ? 'Youth Service' : ''),
			})
		);
		expect(column(csv, 'event_id')).toEqual(['evt_teen_church', 'N/A']);
		const header = csv
			.replace(/^\uFEFF/, '')
			.split(/\r?\n/)[0]
			.split(',')
			.map((h) => h.replace(/"/g, ''));
		expect(header.indexOf('event_id')).toBe(header.indexOf('event') + 1);
	});
});
