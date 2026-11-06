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

	function eventColumn(csv: string): string[] {
		const lines = csv.replace(/^﻿/, '').trim().split(/\r?\n/);
		const header = lines[0].split(',').map((h) => h.replace(/"/g, ''));
		const index = header.indexOf('event');
		return lines.slice(1).map((line) => line.split(',')[index].replace(/"/g, ''));
	}

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
});
