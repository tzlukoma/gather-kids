import 'server-only';

import { getGatherSystemFlag } from '@/lib/flags/get-gathersystem-flag';

/**
 * Server-side gate for the GatherSystem treatment on the post-sign-in account
 * surfaces (`gathersystem_auth`). Fails closed to legacy — see
 * `getGatherSystemFlag`.
 *
 * Deliberately scoped to `/onboarding` and `/unauthorized`, which both require
 * a session and redirect to `/login` without one, so the shared helper's
 * no-session guard is correct for them.
 *
 * It does NOT cover `/login` or `/create-account`. Those serve unauthenticated
 * visitors, who all share the `<env>:anonymous` distinct id, so a flag there is
 * global for signed-out traffic rather than a rollout — a decision raised on
 * #379 rather than guessed at here.
 */
export async function getGatherSystemAuthFlag(): Promise<boolean> {
	return getGatherSystemFlag('gathersystem_auth');
}
