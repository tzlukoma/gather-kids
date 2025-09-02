import { validateJsonTextUpload, type JsonTextUpload } from '@/lib/bibleBee';

describe('JSON Text Upload Validation', () => {
  test('validates correct JSON structure', () => {
    const validJson: JsonTextUpload = {
      competition_year: "2025-2026",
      translations: ["NIV", "KJV"],
      scriptures: [
        {
          reference: "Genesis 1:1",
          texts: {
            "NIV": "In the beginning God created...",
            "KJV": "In the beginning God created..."
          }
        },
        {
          reference: "Genesis 1:2",
          texts: {
            "NIV": "Now the earth was formless...",
            "KJV": "And the earth was without form..."
          }
        }
      ]
    };
    
    const result = validateJsonTextUpload(validJson);
    expect(result.isValid).toBeTruthy();
    expect(result.errors.length).toBe(0);
  });
  
  test('rejects JSON with missing required fields', () => {
    const invalidJson = {
      // Missing competition_year
      translations: ["NIV"],
      scriptures: [
        {
          // Missing reference
          texts: { "NIV": "Some text" }
        }
      ]
    };
    
    const result = validateJsonTextUpload(invalidJson as any);
    expect(result.isValid).toBeFalsy();
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
  
  test('validates JSON without order field', () => {
    const jsonWithoutOrder: JsonTextUpload = {
      competition_year: "2025-2026",
      translations: ["NIV"],
      scriptures: [
        {
          reference: "John 3:16",
          texts: { "NIV": "For God so loved the world..." }
        }
      ]
    };
    
    const result = validateJsonTextUpload(jsonWithoutOrder);
    expect(result.isValid).toBeTruthy();
  });
  
  test('validates JSON with extra fields (ignored fields are allowed)', () => {
    // TypeScript will complain, but we're testing runtime behavior
    const jsonWithExtraFields: any = {
      competition_year: "2025-2026",
      translations: ["NIV"],
      scriptures: [
        {
          reference: "John 3:16",
          extraField: "This should be ignored",
          texts: { "NIV": "For God so loved the world..." }
        }
      ]
    };
    
    const result = validateJsonTextUpload(jsonWithExtraFields);
    expect(result.isValid).toBeTruthy();
  });
});
