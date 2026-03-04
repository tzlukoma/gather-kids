import { AuthRole } from '@/lib/auth-types';

const EXPECTED_ROLES = [
	'ADMIN',
	'MINISTRY_LEADER',
	'GUARDIAN',
	'VOLUNTEER',
	'GUEST',
] as const;

describe('Roles single source of truth', () => {
	it('AuthRole contains exactly the expected set of roles', () => {
		const values = Object.values(AuthRole);
		expect(values).toHaveLength(EXPECTED_ROLES.length);
		expect(values.sort()).toEqual([...EXPECTED_ROLES].sort());
	});

	it('constants/roles re-exports AuthRole only (no ROLES)', () => {
		const rolesModule = require('@/lib/constants/roles');
		expect(rolesModule.AuthRole).toBeDefined();
		expect(rolesModule.AuthRole).toEqual(AuthRole);
		expect(rolesModule.ROLES).toBeUndefined();
		expect(rolesModule.UserRole).toBeUndefined();
		expect(rolesModule.User).toBeUndefined();
	});
});
