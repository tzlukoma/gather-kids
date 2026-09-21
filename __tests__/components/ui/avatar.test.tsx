/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

class LoadedImage {
	complete = true;
	naturalWidth = 1;
	addEventListener() {}
	removeEventListener() {}
	set src(_value: string) {}
}

describe('Avatar', () => {
	beforeAll(() => {
		Object.defineProperty(window, 'Image', {
			writable: true,
			value: LoadedImage,
		});
	});

	it('crops photos to fill a 1:1 frame instead of stretching them', async () => {
		const { container } = render(
			<Avatar>
				<AvatarImage src="/synthetic-child.jpg" alt="Jordan" />
				<AvatarFallback>JK</AvatarFallback>
			</Avatar>
		);

		await waitFor(() => {
			expect(container.querySelector('img')).toHaveClass('object-cover');
		});
		expect(container.querySelector('img')).toHaveClass('aspect-square');
	});
});
