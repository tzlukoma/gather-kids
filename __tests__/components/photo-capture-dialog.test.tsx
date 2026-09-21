/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PhotoCaptureDialog } from '@/components/gatherKids/photo-capture-dialog';
import type { Child } from '@/lib/types';

const mutateAsync = jest.fn();

jest.mock('@/hooks/data', () => ({
	useUpdateChildPhotoMutation: () => ({ mutateAsync }),
}));

jest.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: jest.fn() }),
}));

Object.defineProperty(global.navigator, 'mediaDevices', {
	writable: true,
	value: {
		enumerateDevices: jest.fn().mockResolvedValue([]),
		getUserMedia: jest.fn().mockResolvedValue({
			getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
		}),
	},
});

const child: Child = {
	child_id: 'child-1',
	household_id: 'hh-1',
	first_name: 'Jordan',
	last_name: 'Kim',
	is_active: true,
	created_at: '2026-01-01T00:00:00.000Z',
	updated_at: '2026-01-01T00:00:00.000Z',
};

describe('PhotoCaptureDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('opens the square cropper so the user sees the 1:1 crop before save', () => {
		render(<PhotoCaptureDialog child={child} onClose={jest.fn()} />);

		expect(screen.getByText('Update Photo for Jordan')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Crop to a square. Anything outside the box will not appear in the avatar.'
			)
		).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: /camera/i })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: /upload/i })).toBeInTheDocument();
	});

	it('does not render when no child is selected', () => {
		render(<PhotoCaptureDialog child={null} onClose={jest.fn()} />);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
});
