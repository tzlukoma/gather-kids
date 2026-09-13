/**
 * Age helpers for eligible / ineligible ministry combinations.
 * Pure — no network, synthetic DOBs only.
 */

export type AgeRange = {
	min_age?: number | null;
	max_age?: number | null;
};

function parseIsoDate(iso: string): Date {
	const date = new Date(`${iso}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid ISO date: ${iso}`);
	}
	return date;
}

function toIsoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** UTC "today" as YYYY-MM-DD — keep tests timezone-stable. */
export function todayIsoUtc(now = new Date()): string {
	return now.toISOString().slice(0, 10);
}

/**
 * DOB that yields exactly `ageYears` on `asOfIso` (UTC calendar math).
 */
export function dobForAge(ageYears: number, asOfIso: string = todayIsoUtc()): string {
	if (!Number.isInteger(ageYears) || ageYears < 0) {
		throw new Error(`ageYears must be a non-negative integer, got ${ageYears}`);
	}
	const asOf = parseIsoDate(asOfIso);
	const dob = new Date(asOf);
	dob.setUTCFullYear(asOf.getUTCFullYear() - ageYears);
	return toIsoDate(dob);
}

export function ageOnIso(dobIso: string, asOfIso: string = todayIsoUtc()): number {
	const asOf = parseIsoDate(asOfIso);
	const dob = parseIsoDate(dobIso);
	let age = asOf.getUTCFullYear() - dob.getUTCFullYear();
	const monthDiff = asOf.getUTCMonth() - dob.getUTCMonth();
	if (monthDiff < 0 || (monthDiff === 0 && asOf.getUTCDate() < dob.getUTCDate())) {
		age -= 1;
	}
	return age;
}

export function isAgeEligible(
	age: number,
	range: AgeRange,
	options: { openMin?: number; openMax?: number } = {}
): boolean {
	const min = range.min_age ?? options.openMin ?? -1;
	const max = range.max_age ?? options.openMax ?? 999;
	return age >= min && age <= max;
}

export function isDobEligibleForMinistry(
	dobIso: string,
	range: AgeRange,
	asOfIso: string = todayIsoUtc()
): boolean {
	return isAgeEligible(ageOnIso(dobIso, asOfIso), range);
}

/** Age strictly inside the ministry window (or mid open range when unbounded). */
export function eligibleAgeForMinistry(range: AgeRange): number {
	const min = range.min_age ?? 0;
	const max = range.max_age ?? Math.max(min + 5, 12);
	if (min > max) {
		throw new Error(`Invalid ministry age range: min ${min} > max ${max}`);
	}
	return Math.floor((min + max) / 2);
}

/** One year younger than min_age (or 0 when unbounded). */
export function ineligibleYoungerAgeForMinistry(range: AgeRange): number | null {
	if (range.min_age == null) return null;
	return Math.max(0, range.min_age - 1);
}

/** One year older than max_age. */
export function ineligibleOlderAgeForMinistry(range: AgeRange): number | null {
	if (range.max_age == null) return null;
	return range.max_age + 1;
}

export function dobEligibleForMinistry(
	range: AgeRange,
	asOfIso: string = todayIsoUtc()
): string {
	return dobForAge(eligibleAgeForMinistry(range), asOfIso);
}

export function dobIneligibleYoungerForMinistry(
	range: AgeRange,
	asOfIso: string = todayIsoUtc()
): string | null {
	const age = ineligibleYoungerAgeForMinistry(range);
	if (age == null) return null;
	return dobForAge(age, asOfIso);
}

export function dobIneligibleOlderForMinistry(
	range: AgeRange,
	asOfIso: string = todayIsoUtc()
): string | null {
	const age = ineligibleOlderAgeForMinistry(range);
	if (age == null) return null;
	return dobForAge(age, asOfIso);
}
