/**
 * DAL — shared utility functions
 *
 * Pure helpers with no database dependency, re-exported from dal.ts.
 */

import { differenceInYears, parseISO, isValid, isAfter, isBefore } from 'date-fns';
import type { Ministry } from '../types';

/**
 * Return today's date as a YYYY-MM-DD string (UTC).
 *
 * Do NOT use this for anything that means "what happened at church today" —
 * see `getServiceDayIso`. Retained for age arithmetic, where the UTC day is
 * close enough and a change would shift eligibility boundaries.
 */
export const getTodayIsoDate = (): string =>
    new Date().toISOString().split('T')[0];

/**
 * Re-exported so `@/lib/dal` consumers can reach the service day without
 * knowing where the timezone convention lives. The implementation is in
 * `src/lib/utils/timezone.ts`, which already owned America/New_York.
 */
export { SERVICE_DAY_TIMEZONE, getServiceDayIso } from '../utils/timezone';

/**
 * Compute age (in whole years) on the given ISO date.
 * Returns null when either input is absent or invalid.
 */
export function ageOn(dateISO: string, dobISO?: string): number | null {
    if (!dobISO) return null;
    const date = parseISO(dateISO);
    const dob = parseISO(dobISO);
    if (!isValid(date) || !isValid(dob)) return null;
    const years = differenceInYears(date, dob);
    if (Number.isNaN(years)) return null;
    return years;
}

/**
 * Return true when today falls within the ministry's open/close window.
 */
export function isWithinWindowSync(ministry: Ministry, todayISO: string): boolean {
    const today = parseISO(todayISO);
    const isOpen = ministry.open_at ? isAfter(today, parseISO(ministry.open_at)) : true;
    const isClosed = ministry.close_at ? isBefore(today, parseISO(ministry.close_at)) : true;
    return isOpen && isClosed;
}

/** Normalize email to lowercase + trimmed. */
export function normalizeEmail(email?: string): string | undefined {
    return email ? email.toLowerCase().trim() : undefined;
}

/** Normalize phone number to digits only. */
export function normalizePhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    return phone.replace(/\D/g, '');
}

/** Coerce various DB representations of "active" into a boolean. */
export function isActiveValue(v: unknown): boolean {
    return v === true || v === 1 || String(v) === '1' || String(v) === 'true';
}
