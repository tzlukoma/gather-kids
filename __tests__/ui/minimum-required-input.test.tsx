import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/input';

// Test component that replicates the fixed minimum required field behavior
function MinimumRequiredInput({ onChange }: { onChange: (value: number) => void }) {
  const [value, setValue] = React.useState(0);

  return (
    <Input
      data-testid="minimum-required"
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value.toString()}
      onChange={(e) => {
        // Only allow numeric characters and remove leading zeros
        const cleanValue = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '') || '0';
        const numValue = parseInt(cleanValue) || 0;
        setValue(numValue);
        onChange(numValue);
      }}
    />
  );
}

describe('Minimum Required Input Field', () => {
  it('should prevent leading zeros in mobile-style input', () => {
    const mockOnChange = jest.fn();
    render(<MinimumRequiredInput onChange={mockOnChange} />);
    
    const input = screen.getByTestId('minimum-required') as HTMLInputElement;
    
    // Test entering a leading zero followed by a number (simulating mobile behavior)
    fireEvent.change(input, { target: { value: '05' } });
    
    // Should remove leading zero
    expect(input.value).toBe('5');
    expect(mockOnChange).toHaveBeenCalledWith(5);
  });

  it('should handle multiple leading zeros', () => {
    const mockOnChange = jest.fn();
    render(<MinimumRequiredInput onChange={mockOnChange} />);
    
    const input = screen.getByTestId('minimum-required') as HTMLInputElement;
    
    // Test multiple leading zeros
    fireEvent.change(input, { target: { value: '0012' } });
    
    // Should remove all leading zeros
    expect(input.value).toBe('12');
    expect(mockOnChange).toHaveBeenCalledWith(12);
  });

  it('should allow single zero', () => {
    const mockOnChange = jest.fn();
    render(<MinimumRequiredInput onChange={mockOnChange} />);
    
    const input = screen.getByTestId('minimum-required') as HTMLInputElement;
    
    // Start with a non-zero value first, then test changing to zero
    fireEvent.change(input, { target: { value: '5' } });
    expect(input.value).toBe('5');
    
    // Now test changing to zero
    fireEvent.change(input, { target: { value: '0' } });
    
    // Should keep single zero
    expect(input.value).toBe('0');
    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it('should reject non-numeric characters', () => {
    const mockOnChange = jest.fn();
    render(<MinimumRequiredInput onChange={mockOnChange} />);
    
    const input = screen.getByTestId('minimum-required') as HTMLInputElement;
    
    // Test non-numeric input
    fireEvent.change(input, { target: { value: 'abc123def' } });
    
    // Should keep only numeric characters
    expect(input.value).toBe('123');
    expect(mockOnChange).toHaveBeenCalledWith(123);
  });

  it('should handle empty input by defaulting to 0', () => {
    const mockOnChange = jest.fn();
    render(<MinimumRequiredInput onChange={mockOnChange} />);
    
    const input = screen.getByTestId('minimum-required') as HTMLInputElement;
    
    // Test empty input
    fireEvent.change(input, { target: { value: '' } });
    
    // Should default to '0'
    expect(input.value).toBe('0');
    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it('should handle only leading zeros by defaulting to 0', () => {
    const mockOnChange = jest.fn();
    render(<MinimumRequiredInput onChange={mockOnChange} />);
    
    const input = screen.getByTestId('minimum-required') as HTMLInputElement;
    
    // Test only leading zeros
    fireEvent.change(input, { target: { value: '000' } });
    
    // Should default to '0'
    expect(input.value).toBe('0');
    expect(mockOnChange).toHaveBeenCalledWith(0);
  });
});