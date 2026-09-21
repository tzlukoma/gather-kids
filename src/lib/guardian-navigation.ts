/**
 * The GatherSystem household nav (`1r home`, #371).
 *
 * The legacy sidebar shows `Our Household` and, only for a household with a
 * Bible Bee enrollment, `Bible Bee`. The signed frame shows a four-item tab bar
 * — Home, Household, Bible Bee, Help — with the same conditional Bible Bee
 * item. Both are built from this list so the two shells can never drift into
 * offering a guardian different destinations.
 *
 * Kept free of JSX and of `lucide-react` so the ordering and the conditional
 * are testable in this repo's jsdom, where Radix-bearing components are not.
 */

export type GuardianNavId = 'home' | 'household' | 'bible-bee' | 'help';

export type GuardianNavItem = {
	id: GuardianNavId;
	label: string;
	href: string;
};

/**
 * `Household` is the household's own record — guardians, address, emergency
 * contact, per-child detail — which is what `/household` renders today and what
 * `/household/details` renders once Home takes the top-level route. Nothing a
 * guardian can reach today becomes unreachable.
 */
const HOME: GuardianNavItem = { id: 'home', label: 'Home', href: '/household' };
const HOUSEHOLD: GuardianNavItem = {
	id: 'household',
	label: 'Household',
	href: '/household/details',
};
const BIBLE_BEE: GuardianNavItem = {
	id: 'bible-bee',
	label: 'Bible Bee',
	href: '/household/bible-bee',
};
const HELP: GuardianNavItem = { id: 'help', label: 'Help', href: '/help' };

export function buildGuardianNavItems(
	hasBibleBeeEnrollment: boolean
): GuardianNavItem[] {
	return [
		HOME,
		HOUSEHOLD,
		...(hasBibleBeeEnrollment ? [BIBLE_BEE] : []),
		HELP,
	];
}

/**
 * Which tab reads as current.
 *
 * Exact match for Home, because every other household route starts with
 * `/household` and a prefix rule would light Home up on all of them. Prefix
 * match for the rest, so a child's Bible Bee detail page still shows Bible Bee
 * as the section the guardian is in.
 */
export function isGuardianNavItemActive(
	pathname: string | null | undefined,
	item: GuardianNavItem
): boolean {
	const path = pathname ?? '';
	if (item.href === '/household') return path === '/household';
	return path === item.href || path.startsWith(`${item.href}/`);
}
