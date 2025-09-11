import { supabaseToMinistry, supabaseToBrandingSettings } from '@/lib/database/type-mappings';

describe('ministry & branding mapping warnings', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('supabaseToMinistry warns on legacy fields', () => {
    const record: any = {
      ministry_id: 'm1',
      ministry_code: 'code-legacy',
      label: 'Legacy Name',
      enrollmentType: 'waitlist',
      dataProfile: 'Basic',
    };

  const out: any = supabaseToMinistry(record as any);
    expect(out.code).toBe('code-legacy');
    expect(out.name).toBe('Legacy Name');
    expect(out.enrollment_type).toBe('waitlist');
    expect(out.data_profile).toBe('Basic');
    expect(warnSpy).toHaveBeenCalled();
  });

  test('supabaseToBrandingSettings warns on camelCase fields', () => {
    const record: any = {
      setting_id: 's1',
      org_id: 'org1',
      primaryColor: '#fff',
      secondaryColor: '#000',
      logoUrl: 'https://example.com/logo.png',
      orgName: 'OrgName',
    };

  const out: any = supabaseToBrandingSettings(record as any);
  expect(out.primary_color).toBe('#fff');
  expect(out.secondary_color).toBe('#000');
  expect(out.logo_url).toBe('https://example.com/logo.png');
  expect(out.org_name).toBe('OrgName');
    expect(warnSpy).toHaveBeenCalled();
  });
});
