import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import { usePhoneFormat, formatPhone, cleanPhone } from '@/hooks/usePhoneFormat';
import { PhoneInput } from '@/components/ui/phone-input';

describe('usePhoneFormat hook', () => {
  test('formats phone number correctly as user types', () => {
    const { result } = renderHook(() => usePhoneFormat());

    // Start with empty
    expect(result.current.displayValue).toBe('');
    expect(result.current.rawValue).toBe('');

    // Type first 3 digits
    act(() => {
      const event = { target: { value: '555' } } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleChange(event);
    });
    expect(result.current.displayValue).toBe('(555');
    expect(result.current.rawValue).toBe('555');

    // Type 6 digits
    act(() => {
      const event = { target: { value: '555123' } } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleChange(event);
    });
    expect(result.current.displayValue).toBe('(555) 123');
    expect(result.current.rawValue).toBe('555123');

    // Type full 10 digits
    act(() => {
      const event = { target: { value: '5551234567' } } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleChange(event);
    });
    expect(result.current.displayValue).toBe('(555) 123-4567');
    expect(result.current.rawValue).toBe('5551234567');
  });

  test('handles formatted input correctly', () => {
    const { result } = renderHook(() => usePhoneFormat());

    // User types formatted input
    act(() => {
      const event = { target: { value: '(555) 123-4567' } } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleChange(event);
    });
    expect(result.current.displayValue).toBe('(555) 123-4567');
    expect(result.current.rawValue).toBe('5551234567');
  });

  test('limits input to 10 digits', () => {
    const { result } = renderHook(() => usePhoneFormat('5551234567'));

    // Try to input more than 10 digits - should not change
    act(() => {
      const event = { target: { value: '55512345678999' } } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleChange(event);
    });
    // Should remain at 10 digits
    expect(result.current.displayValue).toBe('(555) 123-4567');
    expect(result.current.rawValue).toBe('5551234567');
  });

  test('handles backspace correctly', () => {
    const { result } = renderHook(() => usePhoneFormat('5551234567'));

    // Remove last digit
    act(() => {
      const event = { target: { value: '(555) 123-456' } } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleChange(event);
    });
    expect(result.current.displayValue).toBe('(555) 123-456');
    expect(result.current.rawValue).toBe('555123456');
  });

  test('initializes with existing value', () => {
    const { result } = renderHook(() => usePhoneFormat('5551234567'));
    expect(result.current.displayValue).toBe('(555) 123-4567');
    expect(result.current.rawValue).toBe('5551234567');
  });
});

describe('formatPhone utility', () => {
  test('formats various phone number inputs', () => {
    expect(formatPhone('')).toBe('');
    expect(formatPhone('5')).toBe('(5');
    expect(formatPhone('555')).toBe('(555');
    expect(formatPhone('5551')).toBe('(555) 1');
    expect(formatPhone('555123')).toBe('(555) 123');
    expect(formatPhone('5551234')).toBe('(555) 123-4');
    expect(formatPhone('5551234567')).toBe('(555) 123-4567');
    expect(formatPhone('555-123-4567')).toBe('(555) 123-4567');
    expect(formatPhone('(555) 123-4567')).toBe('(555) 123-4567');
  });
});

describe('cleanPhone utility', () => {
  test('extracts digits from various formats', () => {
    expect(cleanPhone('')).toBe('');
    expect(cleanPhone('5551234567')).toBe('5551234567');
    expect(cleanPhone('555-123-4567')).toBe('5551234567');
    expect(cleanPhone('(555) 123-4567')).toBe('5551234567');
    expect(cleanPhone('555.123.4567')).toBe('5551234567');
    expect(cleanPhone('+1 (555) 123-4567')).toBe('15551234567');
  });
});

describe('PhoneInput component', () => {
  test('renders with correct formatting', () => {
    const onChange = jest.fn();
    render(<PhoneInput value="5551234567" onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('(555) 123-4567');
    expect(input).toHaveAttribute('type', 'tel');
    expect(input).toHaveAttribute('placeholder', '(555) 123-4567');
  });

  test('calls onChange with raw digits', () => {
    const onChange = jest.fn();
    render(<PhoneInput onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '555' } });
    
    expect(onChange).toHaveBeenCalledWith('555');
  });

  test('handles user typing and formatting', () => {
    const onChange = jest.fn();
    render(<PhoneInput onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    
    // Type digits one by one
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.change(input, { target: { value: '55' } });
    fireEvent.change(input, { target: { value: '555' } });
    fireEvent.change(input, { target: { value: '5551' } });
    fireEvent.change(input, { target: { value: '55512' } });
    fireEvent.change(input, { target: { value: '555123' } });
    fireEvent.change(input, { target: { value: '5551234' } });
    fireEvent.change(input, { target: { value: '55512345' } });
    fireEvent.change(input, { target: { value: '555123456' } });
    fireEvent.change(input, { target: { value: '5551234567' } });
    
    // Should be formatted correctly
    expect(input).toHaveValue('(555) 123-4567');
    expect(onChange).toHaveBeenLastCalledWith('5551234567');
  });

  test('accepts additional props', () => {
    render(<PhoneInput data-testid="phone-input" disabled />);
    
    const input = screen.getByTestId('phone-input');
    expect(input).toBeDisabled();
  });
});