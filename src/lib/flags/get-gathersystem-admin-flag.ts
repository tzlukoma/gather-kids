import 'server-only';

import { getGatherSystemFlag } from '@/lib/flags/get-gathersystem-flag';

/**
 * Server-side gate for the GatherSystem admin shell (`gathersystem_admin`).
 * Fails closed to the legacy shell — see `getGatherSystemFlag`.
 */
export async function getGatherSystemAdminFlag(): Promise<boolean> {
	return getGatherSystemFlag('gathersystem_admin');
}
