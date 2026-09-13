import { isGatherSystemRegistrationOverrideEnabled } from '@/lib/flags/gathersystem-registration-override';

describe('isGatherSystemRegistrationOverrideEnabled', () => {
	const originalOverride = process.env.GATHERSYSTEM_REGISTRATION_OVERRIDE;

	afterEach(() => {
		if (originalOverride === undefined) {
			delete process.env.GATHERSYSTEM_REGISTRATION_OVERRIDE;
		} else {
			process.env.GATHERSYSTEM_REGISTRATION_OVERRIDE = originalOverride;
		}
	});

	it('is enabled only outside production when env is true', () => {
		process.env.GATHERSYSTEM_REGISTRATION_OVERRIDE = 'true';
		expect(isGatherSystemRegistrationOverrideEnabled('development')).toBe(true);
		expect(isGatherSystemRegistrationOverrideEnabled('test')).toBe(true);
		expect(isGatherSystemRegistrationOverrideEnabled('production')).toBe(false);
	});

	it('is disabled when env is not true', () => {
		delete process.env.GATHERSYSTEM_REGISTRATION_OVERRIDE;
		expect(isGatherSystemRegistrationOverrideEnabled('development')).toBe(false);
	});
});
