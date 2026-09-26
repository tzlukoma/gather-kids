import 'server-only';

import { getGatherSystemFlag } from '@/lib/flags/get-gathersystem-flag';

/**
 * Server-side gate for the GatherSystem Bible Bee household screen
 * (`gathersystem_bible_bee_household`): one child's scripture list or essay at
 * `/household/children/[childId]/bible-bee`. Fails closed to the legacy screen
 * — see `getGatherSystemFlag`.
 *
 * Separate from `gathersystem_guardian` on purpose, so the household shell and
 * the Bible Bee rework can go out to UAT independently. Either can be on
 * without the other; with only this one raised, the new screen renders inside
 * the legacy household chrome.
 */
export async function getGatherSystemBibleBeeHouseholdFlag(): Promise<boolean> {
	return getGatherSystemFlag('gathersystem_bible_bee_household');
}
