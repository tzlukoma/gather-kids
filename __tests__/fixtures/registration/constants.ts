/**
 * Synthetic GatherSystem registration fixture constants.
 * Never use real household / guardian / child data here.
 */

/** RFC 2606 reserved test TLD — safe for fixtures and screenshots. */
export const SYNTHETIC_EMAIL_DOMAIN = 'example.test';

export const SYNTHETIC_HOUSEHOLD = {
	name: 'Fixture Household',
	address_line1: '100 Synthetic St',
	address_line2: 'Apt 1',
	city: 'Perth Amboy',
	state: 'NJ',
	zip: '08861',
} as const;

/** Known shared Supabase project refs that registration tests must never target. */
export const BLOCKED_SUPABASE_PROJECT_REFS = [
	'loekqsjtvvuuigxwavyq', // production
	'gekouvbeujfkiaorshim', // UAT preview
] as const;

export const DISPOSABLE_SUPABASE_HOST_PATTERN = /localhost|127\.0\.0\.1/;
