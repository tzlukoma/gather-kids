import 'server-only';

import { getGatherSystemFlag } from '@/lib/flags/get-gathersystem-flag';

/**
 * Server-side gate for the GatherSystem incidents surface
 * (`gathersystem_incidents`). Fails closed to the legacy UI — see
 * `getGatherSystemFlag`.
 *
 * The flag never widens who can see or acknowledge an incident:
 * `/api/incidents` scopes the read and the ADMIN check guards acknowledge,
 * identically on both paths.
 */
export async function getGatherSystemIncidentsFlag(): Promise<boolean> {
	return getGatherSystemFlag('gathersystem_incidents');
}
