import { supabaseToHousehold, supabaseToChild } from '@/lib/database/type-mappings';

describe('type-mappings warnings', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('supabaseToHousehold warns on legacy preferredScriptureTranslation and null addresses', () => {
    const record: any = {
      household_id: 'h1',
      name: 'House',
      preferredScriptureTranslation: 'KJV',
      address_line1: null,
      address_line2: null,
    };

    const out = supabaseToHousehold(record as any);
    expect(out.preferredScriptureTranslation).toBe('KJV');
    expect(out.address_line1).toBe('');
    expect(out.address_line2).toBe('');
    expect(warnSpy).toHaveBeenCalled();
  });

  test('supabaseToChild warns on null dob', () => {
    const record: any = { child_id: 'c1', household_id: 'h1', first_name: 'A', last_name: 'B', dob: null };
    const out = supabaseToChild(record as any);
    expect(out.dob).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });
});
