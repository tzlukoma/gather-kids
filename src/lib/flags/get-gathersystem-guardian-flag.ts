import 'server-only';

import { getGatherSystemFlag } from '@/lib/flags/get-gathersystem-flag';

/**
 * Server-side gate for the GatherSystem guardian shell and home
 * (`gathersystem_guardian`). Fails closed to the legacy household screens —
 * see `getGatherSystemFlag`.
 *
 * Scoped to `/household`, which sits behind the guardian session guard, so the
 * flag is always evaluated with a real user id. It does not cover the Bible Bee
 * scripture and essay screens: those are `gathersystem_bible_bee_household`,
 * and the two are deliberately separable so the household shell can go out to
 * UAT without the Bible Bee rework following it.
 */
export async function getGatherSystemGuardianFlag(): Promise<boolean> {
	return getGatherSystemFlag('gathersystem_guardian');
}
