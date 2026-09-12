export function isBibleBeeCycleActive(value: unknown): boolean {
	return (
		value === true ||
		value === 1 ||
		String(value) === '1' ||
		String(value) === 'true'
	);
}

export type BibleBeeCyclePick = {
	id: string;
	is_active?: unknown;
	name?: string | null;
	created_at?: string | null;
};

/** Prefer the cycle marked active; if none, the newest by name then created_at. */
export function pickActiveBibleBeeCycle<T extends BibleBeeCyclePick>(
	cycles: T[]
): T | null {
	if (!cycles.length) return null;

	const active = cycles.find((cycle) => isBibleBeeCycleActive(cycle.is_active));
	if (active) return active;

	const sorted = [...cycles].sort((a, b) => {
		if (a.name && b.name) {
			return b.name.localeCompare(a.name);
		}
		if (a.created_at && b.created_at) {
			return (
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			);
		}
		return 0;
	});

	return sorted[0] ?? null;
}

export function enrollmentsForActiveBibleBeeCycle<
	T extends { bible_bee_cycle_id: string },
>(enrollments: T[], cycles: BibleBeeCyclePick[]): T[] {
	const active = pickActiveBibleBeeCycle(cycles);
	if (!active) return [];
	return enrollments.filter(
		(enrollment) => enrollment.bible_bee_cycle_id === active.id
	);
}
