import { previewCsvJsonMatches, type CsvRow } from '@/lib/bibleBee';

describe('CSV-JSON Reference Matching', () => {
  // Test case that mimics the issue with James 2:17 and Ruth 1:16
  test('correctly matches references by text, not by order field', () => {
    // Sample CSV rows
    const csvRows: CsvRow[] = [
      { 
        reference: 'James 2:17', 
        text: 'In the same way, faith by itself, if it is not accompanied by action, is dead.',
        translation: 'NIV'
      },
      {
        reference: 'Romans 12:2', 
        text: 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.',
        translation: 'NIV'
      },
      { 
        reference: 'Proverbs 3:5-6', 
        text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
        translation: 'NIV'
      }
    ];
    
    // Sample JSON items with intentionally mismatched order fields
    const jsonItems = [
      {
        order: 3, // Intentionally different from array position
        reference: 'Ruth 1:16',
        texts: {
          'NIV': 'But Ruth replied, "Don\'t urge me to leave you or to turn back from you."',
          'KJV': 'And Ruth said, Intreat me not to leave thee, or to return from following after thee.'
        }
      },
      {
        order: 1, // Intentionally different from array position
        reference: 'Romans 12:2',
        texts: {
          'NIV': 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.',
          'ESV': 'Do not be conformed to this world, but be transformed by the renewal of your mind.'
        }
      },
      {
        order: 2, // Intentionally different from array position
        reference: 'Proverbs 3:5-6',
        texts: {
          'NIV': 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
          'KJV': 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.'
        }
      }
    ];
    
    const result = previewCsvJsonMatches(csvRows, jsonItems);
    
    // Validate matches
    expect(result.matches.length).toBe(2); // Only Romans and Proverbs should match
    expect(result.csvOnly.length).toBe(1); // James 2:17 should be CSV only
    expect(result.jsonOnly.length).toBe(1); // Ruth 1:16 should be JSON only
    
    // Check specific references
    const matchedReferences = result.matches.map(m => m.csv?.row.reference);
    expect(matchedReferences).toContain('Romans 12:2');
    expect(matchedReferences).toContain('Proverbs 3:5-6');
    expect(matchedReferences).not.toContain('James 2:17');
    expect(matchedReferences).not.toContain('Ruth 1:16');
    
    // Verify CSV-only references
    const csvOnlyReferences = result.csvOnly.map(c => c.row.reference);
    expect(csvOnlyReferences).toContain('James 2:17');
    expect(csvOnlyReferences).not.toContain('Romans 12:2');
    
    // Verify JSON-only references
    const jsonOnlyReferences = result.jsonOnly.map(j => j.item.reference);
    expect(jsonOnlyReferences).toContain('Ruth 1:16');
    expect(jsonOnlyReferences).not.toContain('Romans 12:2');
  });

  // Test case for reference normalization
  test('matches references with minor formatting differences', () => {
    // Sample CSV rows with some formatting differences
    const csvRows: CsvRow[] = [
      { reference: 'John 3:16', text: 'For God so loved the world', translation: 'NIV' },
      { reference: 'Psalm  23: 1', text: 'The Lord is my shepherd', translation: 'NIV' }, // Extra spaces
      { reference: '1 cor. 13:4', text: 'Love is patient', translation: 'NIV' } // Abbreviation, lowercase
    ];
    
    // JSON with slightly different formatting of the same references
    const jsonItems = [
      {
        reference: 'JOHN 3:16', // All caps
        texts: { 'NIV': 'For God so loved the world' }
      },
      {
        reference: 'Psalm 23:1', // No extra spaces
        texts: { 'NIV': 'The Lord is my shepherd' }
      },
      {
        reference: '1 Corinthians 13:4', // Full name, not abbreviated
        texts: { 'NIV': 'Love is patient' }
      }
    ];
    
    const result = previewCsvJsonMatches(csvRows, jsonItems);
    
    // All references should match despite format differences
    expect(result.matches.length).toBe(3);
    expect(result.csvOnly.length).toBe(0);
    expect(result.jsonOnly.length).toBe(0);
  });

  // Test case for handling order field removal
  test('ignores order field when matching references', () => {
    const csvRows: CsvRow[] = [
      { reference: 'Genesis 1:1', text: 'In the beginning', translation: 'NIV' }
    ];
    
    const jsonItems = [
      {
        order: 999, // Should be completely ignored
        reference: 'Genesis 1:1',
        texts: { 'NIV': 'In the beginning God created the heavens and the earth' }
      }
    ];
    
    const result = previewCsvJsonMatches(csvRows, jsonItems);
    
    // Should match regardless of order field
    expect(result.matches.length).toBe(1);
    
    // Verify order field is removed
    expect('order' in result.matches[0].json!.item).toBe(false);
  });
});
