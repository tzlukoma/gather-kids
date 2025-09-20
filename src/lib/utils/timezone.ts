/**
 * Timezone utilities for America/New_York comparisons
 */

/**
 * Compare a date against another date in America/New_York timezone
 * @param nowDate - Current date (can be Date or ISO string)
 * @param compareDate - Date to compare against (can be Date or ISO string) 
 * @returns true if nowDate is on or after compareDate in America/New_York timezone
 */
export function isOnOrAfterInET(nowDate: Date | string, compareDate: Date | string): boolean {
    const now = typeof nowDate === 'string' ? new Date(nowDate) : nowDate;
    const target = typeof compareDate === 'string' ? new Date(compareDate) : compareDate;
    
    // Convert both dates to ET (America/New_York) timezone
    // This handles both EST and EDT automatically
    const nowInET = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const targetInET = new Date(target.toLocaleString("en-US", { timeZone: "America/New_York" }));
    
    return nowInET >= targetInET;
}

/**
 * Format a date for display in America/New_York timezone
 * @param date - Date to format (can be Date or ISO string)
 * @returns Formatted date string like "Sep 28, 2025"
 */
export function formatDateInET(date: Date | string): string {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(targetDate);
}

/**
 * Get current date/time in America/New_York timezone
 * @returns Date object representing current time in ET
 */
export function getCurrentDateInET(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}