/**
 * Utility functions for phone number formatting
 * These are pure functions that can be used in both client and server components
 */

/**
 * Extract only digits from a phone number string
 */
export function extractDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Format a phone number string into (###) ###-#### format
 * @param value - Raw phone number string (can contain formatting)
 * @returns Formatted phone number string
 */
export function formatPhone(value: string): string {
  const digits = extractDigits(value);
  
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Clean phone number by removing all formatting, keeping only digits
 * @param value - Formatted or unformatted phone number
 * @returns Clean digits-only string
 */
export function cleanPhone(value: string): string {
  return extractDigits(value);
}