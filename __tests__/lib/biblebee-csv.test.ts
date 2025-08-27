import { validateCsvRows } from '@/lib/bibleBee';

test('CSV validation detects missing fields and duplicates', () => {
    const rows = [
        { reference: 'John 1:1', text: 'In the beginning' },
        { reference: 'John 1:1', text: 'Duplicate' },
        { reference: '', text: 'Missing ref' },
        { reference: 'Luke 2:1', text: '' },
    ];
    const res = validateCsvRows(rows as any);
    expect(res.valid).toBeFalsy();
    expect(res.errors.length).toBeGreaterThanOrEqual(2);
});
