import 'server-only';

import { getGatherSystemFlag } from '@/lib/flags/get-gathersystem-flag';

/**
 * Server-side gate for the GatherSystem check-in door (`gathersystem_door`).
 * Fails closed to the legacy door — see `getGatherSystemFlag`.
 */
export async function getGatherSystemDoorFlag(): Promise<boolean> {
	return getGatherSystemFlag('gathersystem_door');
}
