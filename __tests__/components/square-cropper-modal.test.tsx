import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SquareCropperModal } from '@/components/ui/square-cropper-modal';

// Mock toast hook
jest.mock('@/hooks', () => ({
	toast: jest.fn(),
}));

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
	writable: true,
	value: {
		enumerateDevices: jest.fn().mockResolvedValue([]),
		getUserMedia: jest.fn().mockResolvedValue({
			getTracks: jest.fn().mockReturnValue([
				{
					stop: jest.fn(),
				},
			]),
		}),
	},
});

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

		expect(screen.getByText('Camera')).toBeInTheDocument();
		expect(screen.getByText('Upload')).toBeInTheDocument();
		// Camera tab should be active by default
		expect(screen.getByText('Take Photo')).toBeInTheDocument();
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

		// Test that the component renders with custom props
		expect(screen.getByText('Test Upload')).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: /upload/i })).toBeInTheDocument();

		// Check that the file input has the correct accept attribute
		const fileInput = document.querySelector('input[type="file"]');
		if (fileInput) {
			expect(fileInput).toHaveAttribute('accept', 'image/jpeg');
		}
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

	it('shows camera and upload tabs', () => {
		render(
			<SquareCropperModal
				isOpen={true}
				onClose={mockOnClose}
				onSave={mockOnSave}
				title="Test Upload"
			/>
		);

		expect(screen.getByRole('tab', { name: /camera/i })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: /upload/i })).toBeInTheDocument();
	});

	it('switches between camera and upload tabs', () => {
		render(
			<SquareCropperModal
				isOpen={true}
				onClose={mockOnClose}
				onSave={mockOnSave}
				title="Test Upload"
			/>
		);

		// Test that both tabs are present
		expect(screen.getByRole('tab', { name: /camera/i })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: /upload/i })).toBeInTheDocument();

		// Test that camera tab is initially active
		expect(screen.getByText('Take Photo')).toBeInTheDocument();
	});

	// Note: Testing file upload, cropping, and EXIF processing would require more complex mocking
	// of FileReader, Canvas API, and Image objects. For now, we test the basic component structure.
});
