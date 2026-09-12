/**
 * Bible Bee Scripture Availability Gate
 * 
 * Controls when household/parent views can see scripture text based on
 * the competition_start_date configured for a Bible Bee cycle.
 * 
 * Timezone: America/New_York (ET) - selected because:
 * - Cathedral International is US-based
 * - Consistent with ministry operations timezone
 * - Date-only comparison uses ET midnight as the boundary
 */

/**
 * Check if scripture text is available for household/parent views
 * based on the cycle's competition_start_date.
 * 
 * Logic:
 * - null/undefined start date → available (backward compatible)
 * - today (ET date) < start date → locked
 * - today (ET date) >= start date → available
 * 
 * Admin and evaluation paths should NOT call this function -
 * they always have full access to scripture text.
 * 
 * @param competitionStartDate - ISO date string (YYYY-MM-DD) or null/undefined
 * @returns true if scriptures are available, false if locked
 */
export function areScripturesAvailable(competitionStartDate: string | null | undefined): boolean {
	// Null or undefined start date means scriptures are immediately available (backward compatible)
	if (!competitionStartDate) {
		return true;
	}

	// Get today's date in America/New_York timezone (date-only)
	const todayET = new Date().toLocaleDateString('en-US', { 
		timeZone: 'America/New_York',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	
	// Convert MM/DD/YYYY to YYYY-MM-DD for comparison
	const [month, day, year] = todayET.split('/');
	const todayYYYYMMDD = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

	// Date-only string comparison (YYYY-MM-DD format)
	return todayYYYYMMDD >= competitionStartDate;
}

/**
 * Get the formatted start date for display in locked state messaging
 * 
 * @param competitionStartDate - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "September 15, 2026")
 */
export function formatStartDate(competitionStartDate: string): string {
	const date = new Date(competitionStartDate + 'T00:00:00');
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'America/New_York'
	});
}
