import { useState, useCallback, ChangeEvent } from 'react';

/**
 * Custom hook for phone number formatting
 * Formats phone numbers as (###) ###-#### while typing
 * Returns both formatted display value and raw digits for form submission
 */
export function usePhoneFormat(initialValue: string = '') {
  // Store the raw digits (for form submission)
  const [rawValue, setRawValue] = useState(() => extractDigits(initialValue));
  
  // Format digits into (###) ###-#### format
  const formatPhoneNumber = useCallback((digits: string): string => {
    // Remove all non-digits
    const cleaned = digits.replace(/\D/g, '');
    
    // Apply formatting based on length
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }, []);

  // Get formatted display value
  const displayValue = formatPhoneNumber(rawValue);

  // Handle input changes
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value;
    const digits = extractDigits(input);
    
    // Limit to 10 digits
    if (digits.length <= 10) {
      setRawValue(digits);
    }
  }, []);

  // Get props for the input element
  const getInputProps = useCallback(() => ({
    value: displayValue,
    onChange: handleChange,
    placeholder: '(555) 123-4567',
    type: 'tel' as const,
    maxLength: 14, // Max length for formatted phone number
  }), [displayValue, handleChange]);

  return {
    rawValue, // Raw digits for form submission
    displayValue, // Formatted value for display
    handleChange,
    getInputProps,
    setValue: setRawValue, // Allow external setting of raw value
    formatPhoneNumber, // Expose formatting function
  };
}

/**
 * Extract only digits from a string
 */
function extractDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Utility function to format a phone number string
 * Can be used outside of the hook for one-off formatting
 */
export function formatPhone(value: string): string {
  const digits = extractDigits(value);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Utility function to clean phone number (extract digits only)
 * Use this before form submission
 */
export function cleanPhone(value: string): string {
  return extractDigits(value);
}