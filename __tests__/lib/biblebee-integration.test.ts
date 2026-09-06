import { previewCsvJsonMatches, type CsvRow, type JsonTextUpload, validateJsonTextUpload } from '@/lib/bibleBee';

const mockCsvRows: CsvRow[] = [
  {
    reference: 'James 2:17',
    text: 'In the same way, faith by itself, if it is not accompanied by action, is dead.',
    translation: 'NIV',
    scripture_order: 1,
  },
  {
    reference: 'Romans 12:2',
    text: 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.',
    translation: 'NIV',
    scripture_order: 2,
  },
  {
    reference: 'Proverbs 3:5-6',
    text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he shall make your paths straight.',
    translation: 'NIV',
    scripture_order: 3,
  },
];

const mockJsonData: JsonTextUpload = {
  competition_year: '2025-2026',
  translations: ['NIV', 'KJV'],
  scriptures: [
    {
      reference: 'Ruth 1:16',
      texts: {
        NIV: 'But Ruth replied, "Don\'t urge me to leave you or to turn back from you."',
        KJV: 'And Ruth said, Intreat me not to leave thee, or to return from following after thee.',
      },
    },
    {
      reference: 'Romans 12:2',
      texts: {
        NIV: 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.',
        ESV: 'Do not be conformed to this world, but be transformed by the renewal of your mind.',
      },
    },
    {
      reference: 'Proverbs 3:5-6',
      texts: {
        NIV: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he shall make your paths straight.',
        KJV: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.',
      },
    },
  ],
};

describe('CSV and JSON Integration Tests', () => {
  test('should correctly match references by text when importing CSV and JSON', () => {
    const previewResult = previewCsvJsonMatches(mockCsvRows, mockJsonData.scriptures);

    expect(previewResult.matches.length).toBe(2);
    expect(previewResult.csvOnly.length).toBe(1);
    expect(previewResult.jsonOnly.length).toBe(1);

    const scriptures = mockCsvRows.map((row) => ({
      id: crypto.randomUUID(),
      competitionYearId: 'test-year-id',
      reference: row.reference,
      text: row.text,
      translation: row.translation,
      scripture_order: row.scripture_order,
    }));

    expect(scriptures).toHaveLength(3);
    expect(scriptures.find((s) => s.reference?.includes('James 2:17'))?.scripture_order).toBe(1);
    expect(scriptures.find((s) => s.reference?.includes('Romans 12:2'))?.scripture_order).toBe(2);
    expect(scriptures.find((s) => s.reference?.includes('Proverbs 3:5-6'))?.scripture_order).toBe(3);

    const validation = validateJsonTextUpload(mockJsonData);
    expect(validation.isValid).toBeTruthy();

    const normalizeReference = (s?: string | null) =>
      (s ?? '')
        .toString()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\d\s:\-]/g, '')
        .toLowerCase();

    for (const item of mockJsonData.scriptures) {
      const existing = scriptures.find(
        (s) => normalizeReference(s.reference) === normalizeReference(item.reference),
      ) as (typeof scriptures)[number] & { texts?: Record<string, string> } | undefined;
      if (existing) {
        existing.texts = item.texts;
      }
    }

    const updatedRomans = scriptures.find((s) => s.reference?.includes('Romans 12:2')) as
      | ((typeof scriptures)[number] & { texts?: Record<string, string> })
      | undefined;
    const updatedProverbs = scriptures.find((s) => s.reference?.includes('Proverbs 3:5-6')) as
      | ((typeof scriptures)[number] & { texts?: Record<string, string> })
      | undefined;
    const updatedJames = scriptures.find((s) => s.reference?.includes('James 2:17')) as
      | ((typeof scriptures)[number] & { texts?: Record<string, string> })
      | undefined;

    expect(updatedRomans?.texts).toBeDefined();
    expect(updatedProverbs?.texts).toBeDefined();
    expect(updatedJames?.texts).toBeUndefined();
    expect(updatedRomans?.texts?.['NIV']).toBe(mockJsonData.scriptures[1].texts['NIV']);
    expect(updatedProverbs?.texts?.['KJV']).toBe(mockJsonData.scriptures[2].texts['KJV']);
    expect(updatedJames?.texts?.['NIV']).not.toBe(mockJsonData.scriptures[0].texts['NIV']);
  });
});
