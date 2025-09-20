'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import { extractDigits, formatPhone as formatPhoneNumber, cleanPhone } from '@/lib/phone-utils';

/**
 * Custom hook for phone number formatting
 * Formats phone numbers as (###) ###-#### while typing
 * Returns both formatted display value and raw digits for form submission
 */
export function usePhoneFormat(initialValue: string = '') {
  // Store the raw digits (for form submission)
  const [rawValue, setRawValue] = useState(() => extractDigits(initialValue));
  
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

// Re-export utility functions from phone-utils for backward compatibility
export { formatPhone, cleanPhone } from '@/lib/phone-utils';