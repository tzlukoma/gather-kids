let sequence = 0;

/** Reset deterministic id counter (Jest only). */
export function resetSyntheticIdSequence(next = 0): void {
	sequence = next;
}

/**
 * Stable synthetic id for fixtures. Not a real DB uuid unless `random` is true.
 */
export function syntheticId(prefix: string, random = false): string {
	if (random && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return `${prefix}_${crypto.randomUUID()}`;
	}
	sequence += 1;
	return `${prefix}_${String(sequence).padStart(4, '0')}`;
}

export function syntheticEmail(localPart = 'guardian.fixture'): string {
	return `${localPart}.${sequence || 1}@example.test`;
}
