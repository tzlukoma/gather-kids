/**
 * Namespaced dev logging — off by default so the browser console stays readable.
 *
 * Enable all:  localStorage.setItem('gk:dev-log', '*')
 * Enable some: localStorage.setItem('gk:dev-log', 'register,auth,dal,household')
 * Disable:     localStorage.removeItem('gk:dev-log')
 *
 * Or set NEXT_PUBLIC_DEV_LOG=register,auth,dal in .env.local / .env.r1.local
 */

const LS_KEY = 'gk:dev-log';

export type DevLogNamespace =
	| 'register'
	| 'auth'
	| 'dal'
	| 'household'
	| 'bible-bee'
	| 'debug-panel';

function parseList(raw: string | undefined): Set<string> | 'all' | null {
	if (!raw?.trim()) return null;
	const items = raw
		.split(',')
		.map(s => s.trim())
		.filter(Boolean);
	if (items.includes('*')) return 'all';
	return new Set(items);
}

function getEnabledNamespaces(): Set<string> | 'all' | null {
	const fromEnv = parseList(process.env.NEXT_PUBLIC_DEV_LOG);
	if (fromEnv) return fromEnv;

	if (typeof window !== 'undefined') {
		return parseList(localStorage.getItem(LS_KEY) ?? undefined);
	}

	return null;
}

function isEnabled(namespace: DevLogNamespace): boolean {
	const enabled = getEnabledNamespaces();
	if (!enabled) return false;
	if (enabled === 'all') return true;
	return enabled.has(namespace);
}

export function createDevLogger(namespace: DevLogNamespace) {
	return {
		log: (...args: unknown[]) => {
			if (isEnabled(namespace)) {
				console.log(`[${namespace}]`, ...args);
			}
		},
		warn: (...args: unknown[]) => {
			if (isEnabled(namespace)) {
				console.warn(`[${namespace}]`, ...args);
			}
		},
		/** Always visible — use for real failures only */
		error: (...args: unknown[]) => {
			console.error(`[${namespace}]`, ...args);
		},
	};
}

/** Shorthand: createDevLogger('dal') */
export function devLog(namespace: DevLogNamespace) {
  return createDevLogger(namespace);
}

export function isDevLogEnabled(namespace: DevLogNamespace): boolean {
  return isEnabled(namespace);
}
