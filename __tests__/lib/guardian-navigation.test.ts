import {
	buildGuardianNavItems,
	isGuardianNavItemActive,
} from '@/lib/guardian-navigation';

describe('buildGuardianNavItems', () => {
	it('matches the signed frame when the household has a Bible Bee child', () => {
		expect(buildGuardianNavItems(true).map((item) => item.label)).toEqual([
			'Home',
			'Household',
			'Bible Bee',
			'Help',
		]);
	});

	it('drops Bible Bee for a household with no enrollment, as the sidebar does', () => {
		expect(buildGuardianNavItems(false).map((item) => item.label)).toEqual([
			'Home',
			'Household',
			'Help',
		]);
	});

	it('points every tab at a route that exists', () => {
		expect(buildGuardianNavItems(true).map((item) => item.href)).toEqual([
			'/household',
			'/household/details',
			'/household/bible-bee',
			'/help',
		]);
	});
});

describe('isGuardianNavItemActive', () => {
	const [home, household, bibleBee, help] = buildGuardianNavItems(true);

	it('lights Home only on the household root', () => {
		expect(isGuardianNavItemActive('/household', home)).toBe(true);
		expect(isGuardianNavItemActive('/household/bible-bee', home)).toBe(false);
		expect(isGuardianNavItemActive('/household/details', home)).toBe(false);
	});

	it('keeps a section lit on its own child routes', () => {
		expect(
			isGuardianNavItemActive('/household/bible-bee/anything', bibleBee)
		).toBe(true);
		expect(isGuardianNavItemActive('/household/details', household)).toBe(true);
		expect(isGuardianNavItemActive('/help', help)).toBe(true);
	});

	it('does not light a tab on a route that merely shares its prefix string', () => {
		expect(isGuardianNavItemActive('/household/detailsomething', household)).toBe(
			false
		);
		expect(isGuardianNavItemActive('/helpdesk', help)).toBe(false);
	});

	it('treats a missing pathname as nothing being active', () => {
		expect(isGuardianNavItemActive(null, home)).toBe(false);
		expect(isGuardianNavItemActive(undefined, bibleBee)).toBe(false);
	});
});
