import 'server-only';
import { getCurrentRegistrationCycle } from '@/lib/dal/ministries';
import { HomeView } from '@/components/gatherKids/home-view';

// The cycle label comes from the database, so the page cannot be fully static.
// Five minutes is well inside the resolution anyone needs for a cycle that
// changes once a year.
export const revalidate = 300;

/**
 * Resolve the active registration cycle for the public home page.
 *
 * Best-effort on purpose: this is an unauthenticated page and a cycle read that
 * fails (or a deployment with no active cycle) must still render the fork. The
 * caller falls back to cycle-free copy when this returns nulls.
 */
async function getHomePageCycle(): Promise<{ cycleName: string | null }> {
	try {
		const cycle = await getCurrentRegistrationCycle();
		return { cycleName: cycle?.name ?? null };
	} catch (error) {
		console.error('Failed to resolve active registration cycle:', error);
		return { cycleName: null };
	}
}

export default async function Home() {
	const { cycleName } = await getHomePageCycle();

	return <HomeView cycleName={cycleName} />;
}

export { getHomePageCycle };
