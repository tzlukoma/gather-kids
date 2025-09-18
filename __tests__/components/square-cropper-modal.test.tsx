import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SquareCropperModal } from '@/components/ui/square-cropper-modal';

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

describe('SquareCropperModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <SquareCropperModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        title="Test Upload"
        description="Test description"
      />
    );

    expect(screen.getByText('Test Upload')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <SquareCropperModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
        title="Test Upload"
        description="Test description"
      />
    );

    expect(screen.queryByText('Test Upload')).not.toBeInTheDocument();
  });

  it('shows file upload area initially', () => {
    render(
      <SquareCropperModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        title="Test Upload"
      />
    );

    expect(screen.getByText('Click to upload')).toBeInTheDocument();
    expect(screen.getByText(/jpg, png, webp up to 10MB/i)).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <SquareCropperModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        title="Test Upload"
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('accepts custom file types and size limits', () => {
    render(
      <SquareCropperModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        title="Test Upload"
        acceptedTypes={['image/jpeg']}
        maxFileSize={5 * 1024 * 1024} // 5MB
      />
    );

    expect(screen.getByText(/jpeg up to 5MB/i)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <SquareCropperModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        title="Test Upload"
        description="Test description"
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-describedby', 'cropper-description');
  });

  // Note: Testing file upload, cropping, and EXIF processing would require more complex mocking
  // of FileReader, Canvas API, and Image objects. For now, we test the basic component structure.
});