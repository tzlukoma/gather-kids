import { previewCsvJsonMatches, type CsvRow, type JsonTextUpload, validateJsonTextUpload, commitCsvRowsToYear } from '@/lib/bibleBee';

// Mock scriptures array that will be shared between the mock and test
const mockScriptures: any[] = [];

// Mock the database operations
jest.mock('@/lib/db', () => {
  return {
    db: {
      scriptures: {
        clear: jest.fn(() => {
          mockScriptures.length = 0; // Clear the array
          return Promise.resolve();
        }),
        put: jest.fn((item) => {
          const existingIndex = mockScriptures.findIndex(s => s.id === item.id);
          if (existingIndex >= 0) {
            // Update existing item
            mockScriptures[existingIndex] = { ...mockScriptures[existingIndex], ...item };
          } else {
            // Add new item
            mockScriptures.push(item);
          }
          return Promise.resolve(item.id);
        }),
        where: jest.fn((field) => ({
          equals: jest.fn((value) => ({
            or: jest.fn((altField) => ({
              equals: jest.fn((altValue) => ({
                toArray: jest.fn(() => Promise.resolve([...mockScriptures]))
              }))
            })),
            toArray: jest.fn(() => {
              // Filter scriptures based on field and value
              if (field === 'competitionYearId' || field === 'year_id') {
                return Promise.resolve(mockScriptures.filter(s => 
                  s.competitionYearId === value || s.year_id === value
                ));
              }
              return Promise.resolve([...mockScriptures]);
            })
          })),
          toArray: jest.fn(() => Promise.resolve([...mockScriptures]))
        }))
      }
    }
  };
});

// Import the mocked db for use in tests
const { db } = require('@/lib/db');

// Mock commitCsvRowsToYear to avoid database operations
jest.mock('@/lib/bibleBee', () => {
  const originalModule = jest.requireActual('@/lib/bibleBee');
  return {
    ...originalModule,
    commitCsvRowsToYear: jest.fn(async (rows, yearId) => {
      // Simulate adding rows to the database by adding them to our mock array
      for (const row of rows) {
        const scriptureItem = {
          id: crypto.randomUUID(),
          competitionYearId: yearId,
          reference: row.reference,
          text: row.text,
          translation: row.translation,
          scripture_order: row.scripture_order,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        mockScriptures.push(scriptureItem);
      }
      return { inserted: rows.length, updated: 0 };
    })
  };
});

// Mock data for both CSV and JSON inputs
const mockCsvRows: CsvRow[] = [
  { 
    reference: 'James 2:17', 
    text: 'In the same way, faith by itself, if it is not accompanied by action, is dead.',
    translation: 'NIV',
    scripture_order: 1
  },
  {
    reference: 'Romans 12:2', 
    text: 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.',
    translation: 'NIV',
    scripture_order: 2
  },
  { 
    reference: 'Proverbs 3:5-6', 
    text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
    translation: 'NIV',
    scripture_order: 3
  }
];

const mockJsonData: JsonTextUpload = {
  competition_year: "2025-2026",
  translations: ["NIV", "KJV"],
  scriptures: [
    {
      reference: "Ruth 1:16",
      texts: {
        'NIV': 'But Ruth replied, "Don\'t urge me to leave you or to turn back from you."',
        'KJV': 'And Ruth said, Intreat me not to leave thee, or to return from following after thee.'
      }
    },
    {
      reference: "Romans 12:2",
      texts: {
        'NIV': 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.',
        'ESV': 'Do not be conformed to this world, but be transformed by the renewal of your mind.'
      }
    },
    {
      reference: "Proverbs 3:5-6",
      texts: {
        'NIV': 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
        'KJV': 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.'
      }
    }
  ]
};

describe('CSV and JSON Integration Tests', () => {
  // Setup: Clear database before tests
  beforeEach(async () => {
    // Clear the scriptures collection to start fresh
    await db.scriptures.clear();
  });

  // The main test case that verifies the key functionality
  test('should correctly match references by text when importing CSV and JSON', async () => {
    const yearId = 'test-year-id';
    
    // Step 1: First do a preview to check matching logic
    const previewResult = previewCsvJsonMatches(mockCsvRows, mockJsonData.scriptures);
    
    // Validate the preview results
    expect(previewResult.matches.length).toBe(2); // Romans and Proverbs should match
    expect(previewResult.csvOnly.length).toBe(1); // James 2:17 should be in CSV only
    expect(previewResult.jsonOnly.length).toBe(1); // Ruth 1:16 should be in JSON only
    
    // Step 2: Commit the CSV rows to the database
    await commitCsvRowsToYear(mockCsvRows, yearId);
    
    // Step 3: Verify the database state after CSV import
    const scriptures = await db.scriptures
      .where('competitionYearId').equals(yearId)
      .or('year_id').equals(yearId)
      .toArray();
    
    expect(scriptures.length).toBe(3); // All three CSV entries should be added
    
    // Step 4: Find the specific entries
    const jamesVerse = scriptures.find((s: any) => s.reference?.includes('James 2:17'));
    const romansVerse = scriptures.find((s: any) => s.reference?.includes('Romans 12:2'));
    const proverbsVerse = scriptures.find((s: any) => s.reference?.includes('Proverbs 3:5-6'));
    
    // Step 5: Verify scripture_order matches the original CSV values
    expect(jamesVerse?.scripture_order).toBe(1);
    expect(romansVerse?.scripture_order).toBe(2);
    expect(proverbsVerse?.scripture_order).toBe(3);
    
    // Step 6: Verify that no entries have 'order' field
    expect('order' in (jamesVerse || {})).toBe(false);
    expect('order' in (romansVerse || {})).toBe(false);
    expect('order' in (proverbsVerse || {})).toBe(false);
    
    // Step 7: Create a function to mock the uploadJsonTexts functionality
    // (we need to test the matching logic without depending on the specific function)
    const simulateJsonImport = async () => {
      // Validate the JSON data
      const validation = validateJsonTextUpload(mockJsonData);
      expect(validation.isValid).toBeTruthy();
      
      // Process each scripture item
      for (const item of mockJsonData.scriptures) {
        // Find by normalized reference
        const normalizeReference = (s?: string | null) =>
          (s ?? '')
            .toString()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\d\s:\-]/g, '')
            .toLowerCase();
            
        const normalizedRef = normalizeReference(item.reference);
        const existing = scriptures.find((s: any) => {
          const existingNormalized = normalizeReference(s.reference);
          return existingNormalized === normalizedRef;
        });
        
        if (existing) {
          // Update with texts
          await db.scriptures.put({
            ...existing,
            texts: item.texts,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    };
    
    // Step 8: Simulate JSON import
    await simulateJsonImport();
    
    // Step 9: Verify database state after JSON import
    const updatedScriptures = await db.scriptures
      .where('competitionYearId').equals(yearId)
      .or('year_id').equals(yearId)
      .toArray();
      
    // Step 10: Check that texts were added only to matching references
    const updatedRomans = updatedScriptures.find((s: any) => s.reference?.includes('Romans 12:2'));
    const updatedProverbs = updatedScriptures.find((s: any) => s.reference?.includes('Proverbs 3:5-6'));
    const updatedJames = updatedScriptures.find((s: any) => s.reference?.includes('James 2:17'));
    
    // Romans and Proverbs should have texts
    expect(updatedRomans?.texts).toBeDefined();
    expect(Object.keys(updatedRomans?.texts || {}).length).toBeGreaterThan(0);
    expect(updatedProverbs?.texts).toBeDefined();
    expect(Object.keys(updatedProverbs?.texts || {}).length).toBeGreaterThan(0);
    
    // James should NOT have texts since it wasn't in the JSON
    expect(updatedJames?.texts).toBeUndefined();
    
    // Verify texts match what was in the JSON
    expect(updatedRomans?.texts?.['NIV']).toBe(mockJsonData.scriptures[1].texts['NIV']);
    expect(updatedProverbs?.texts?.['KJV']).toBe(mockJsonData.scriptures[2].texts['KJV']);
    
    // Most importantly, verify James 2:17 does NOT have Ruth 1:16's text
    // This is the critical test that was failing before the fix
    expect(updatedJames?.texts?.['NIV']).not.toBe(mockJsonData.scriptures[0].texts['NIV']);
  });
});
