import {
	getAuthorizedGatherSystemNavGroups,
	getAuthorizedMenuItems,
	MENU_ITEMS,
} from '@/lib/navigation';
import { AuthRole } from '@/lib/auth-types';

describe('GatherSystem staff shell navigation groups', () => {
	it('gives ADMIN the locked IA groups in order', () => {
		const groups = getAuthorizedGatherSystemNavGroups(AuthRole.ADMIN, []);

		expect(groups.map((g) => g.label)).toEqual([
			'TODAY',
			'PEOPLE',
			'PROGRAMS',
			'ADMINISTRATION',
		]);
		expect(groups.map((g) => g.items.map((i) => i.label))).toEqual([
			['Dashboard', 'Check-In/Out', 'Incidents'],
			['Rosters', 'Registrations', 'Leaders'],
			['Bible Bee', 'Ministries'],
			['Reports', 'Branding', 'Users'],
		]);
	});

	it('never includes Calendar', () => {
		expect(MENU_ITEMS.some((i) => i.href === '/calendar')).toBe(false);
		const groups = getAuthorizedGatherSystemNavGroups(AuthRole.ADMIN, []);
		const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
		expect(hrefs).not.toContain('/calendar');
	});

	it('puts Users under ADMINISTRATION for ADMIN only', () => {
		const adminGroups = getAuthorizedGatherSystemNavGroups(AuthRole.ADMIN, []);
		const administration = adminGroups.find(
			(g) => g.label === 'ADMINISTRATION'
		);
		expect(administration?.items.map((i) => i.href)).toContain('/users');

		const leaderGroups = getAuthorizedGatherSystemNavGroups(
			AuthRole.MINISTRY_LEADER,
			['min_sunday_school']
		);
		const leaderHrefs = leaderGroups.flatMap((g) =>
			g.items.map((i) => i.href)
		);
		expect(leaderHrefs).not.toContain('/users');
	});

	it('keeps MINISTRY_LEADER scope: no ADMIN-only destinations, no dashboard', () => {
		const groups = getAuthorizedGatherSystemNavGroups(
			AuthRole.MINISTRY_LEADER,
			['min_sunday_school', 'min_bible_bee']
		);
		const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));

		expect(hrefs).toEqual(
			expect.arrayContaining([
				'/check-in',
				'/incidents',
				'/rosters',
				'/registrations',
				'/bible-bee',
			])
		);
		for (const adminOnly of [
			'/admin-overview',
			'/reports',
			'/branding',
			'/users',
			'/leaders',
			'/ministries',
		]) {
			expect(hrefs).not.toContain(adminOnly);
		}
	});

	it('applies the same ministry gating as the legacy nav', () => {
		// A leader without Sunday School or Bible Bee assignments loses those items
		const groups = getAuthorizedGatherSystemNavGroups(
			AuthRole.MINISTRY_LEADER,
			['min_choir']
		);
		const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
		expect(hrefs).not.toContain('/check-in');
		expect(hrefs).not.toContain('/bible-bee');
		expect(hrefs).toContain('/incidents');
	});

	it('applies requiresActive gating like the legacy nav', () => {
		const groups = getAuthorizedGatherSystemNavGroups(
			AuthRole.MINISTRY_LEADER,
			['min_sunday_school', 'min_bible_bee'],
			false
		);
		const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
		expect(hrefs).toEqual(['/incidents']);
	});

	it('returns no groups when there is no role', () => {
		expect(getAuthorizedGatherSystemNavGroups(null)).toEqual([]);
	});

	it('matches the legacy flat menu item-for-item per role (parity guard)', () => {
		for (const role of [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER]) {
			const ministries = ['min_sunday_school', 'min_bible_bee'];
			const legacyStaffHrefs = getAuthorizedMenuItems(role, ministries)
				.map((i) => i.href)
				.filter((href) => href !== '/household')
				.sort();
			const groupedHrefs = getAuthorizedGatherSystemNavGroups(role, ministries)
				.flatMap((g) => g.items.map((i) => i.href))
				.sort();
			expect(groupedHrefs).toEqual(legacyStaffHrefs);
		}
	});
});
