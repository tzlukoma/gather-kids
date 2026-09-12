import type { FlagEvalContext, FlagKey } from '@/lib/flags/env';

export type FlagAdapter = {
	getBoolean(
		key: FlagKey,
		defaultValue: boolean,
		context: FlagEvalContext
	): Promise<boolean>;
	getVariant(
		key: FlagKey,
		defaultValue: string,
		context: FlagEvalContext
	): Promise<string>;
};
