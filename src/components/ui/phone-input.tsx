import React, { forwardRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatPhone, cleanPhone } from '@/hooks/usePhoneFormat';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
  value?: string;
  onChange?: (value: string) => void; // Returns raw digits for form
  onDisplayChange?: (displayValue: string) => void; // Returns formatted display value
}

/**
 * PhoneInput component that automatically formats phone numbers as (###) ###-####
 * 
 * Props:
 * - value: Raw phone digits (what gets stored in form)
 * - onChange: Called with raw digits when input changes
 * - onDisplayChange: Called with formatted display value when input changes
 * - All other Input props are supported
 */
const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = '', onChange, onDisplayChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => formatPhone(value));

    // Update display value when external value changes
    useEffect(() => {
      const formatted = formatPhone(value);
      setDisplayValue(formatted);
    }, [value]);

    // Handle changes from the input
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;
      const digits = cleanPhone(inputValue);
      
      // Limit to 10 digits
      if (digits.length <= 10) {
        const formatted = formatPhone(digits);
        setDisplayValue(formatted);
        
        // Notify parent components
        onChange?.(digits);
        onDisplayChange?.(formatted);
      }
    };

    return (
      <Input
        ref={ref}
        className={cn(className)}
        value={displayValue}
        onChange={handleInputChange}
        type="tel"
        placeholder="(555) 123-4567"
        maxLength={14}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };