import {
	clampSourceSquare,
	containedLayout,
	drawPreviewCrop,
	drawSquareCrop,
	initialCenteredSquareCrop,
	mapCropCornersToSource,
	mapCropToSource,
} from '@/lib/avatar/crop-coords';

describe('contained crop coordinates', () => {
	const squareContainer = { width: 400, height: 400 };

	it('maps a centered overlay on a 4:3 landscape image to the inscribed source square', () => {
		const image = { width: 800, height: 600 };
		const layout = containedLayout(squareContainer, image);
		const crop = initialCenteredSquareCrop(layout);
		const source = mapCropToSource({
			crop,
			container: squareContainer,
			image,
			userScale: 1,
		});

		// object-contain letterboxes 50px top and bottom in a 400×400 box.
		// The overlay sits on the image, not in the bars, so sy is 0 not 100.
		expect(layout.offsetX).toBe(0);
		expect(layout.offsetY).toBe(50);
		expect(crop).toEqual({ x: 50, y: 50, size: 300 });
		expect(source.sx).toBeCloseTo(100);
		expect(source.sy).toBeCloseTo(0);
		expect(source.sSize).toBeCloseTo(600);
	});

	it('maps a centered overlay on a 3:4 portrait image to the inscribed source square', () => {
		const image = { width: 600, height: 800 };
		const layout = containedLayout(squareContainer, image);
		const crop = initialCenteredSquareCrop(layout);
		const source = mapCropToSource({
			crop,
			container: squareContainer,
			image,
			userScale: 1,
		});

		expect(layout.offsetX).toBe(50);
		expect(layout.offsetY).toBe(0);
		expect(source.sx).toBeCloseTo(0);
		expect(source.sy).toBeCloseTo(100);
		expect(source.sSize).toBeCloseTo(600);
	});

	it('maps a square image to the full source', () => {
		const image = { width: 512, height: 512 };
		const layout = containedLayout(squareContainer, image);
		const crop = initialCenteredSquareCrop(layout);
		const source = mapCropToSource({
			crop,
			container: squareContainer,
			image,
			userScale: 1,
		});

		expect(source.sx).toBeCloseTo(0);
		expect(source.sy).toBeCloseTo(0);
		expect(source.sSize).toBeCloseTo(512);
	});

	it('maps a 4:3 camera frame in the real cropper box (w-full × h-96)', () => {
		const container = { width: 400, height: 384 };
		const image = { width: 640, height: 480 };
		const layout = containedLayout(container, image);
		const crop = initialCenteredSquareCrop(layout);
		const source = mapCropToSource({
			crop,
			container,
			image,
			userScale: 1,
		});

		expect(source.sx).toBeCloseTo(80);
		expect(source.sy).toBeCloseTo(0);
		expect(source.sSize).toBeCloseTo(480);
	});

	it('does not treat letterbox as source pixels the way dividing overlay by fit-scale would', () => {
		const image = { width: 800, height: 600 };
		const layout = containedLayout(squareContainer, image);
		const crop = initialCenteredSquareCrop(layout);
		const naiveSy = crop.y / layout.fitScale;

		expect(naiveSy).toBeCloseTo(100);
		expect(
			mapCropToSource({
				crop,
				container: squareContainer,
				image,
				userScale: 1,
			}).sy
		).toBeCloseTo(0);
	});

	it('draws the mapped 4:3 crop into a square output', () => {
		const image = { width: 8, height: 6 };
		const container = { width: 400, height: 400 };
		const layout = containedLayout(container, image);
		const crop = initialCenteredSquareCrop(layout);
		const source = clampSourceSquare(
			mapCropToSource({
				crop,
				container,
				image,
				userScale: 1,
			}),
			image
		);

		const drawImage = jest.fn();
		const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
		const bitmap = {} as CanvasImageSource;

		drawSquareCrop(ctx, bitmap, source, 4);

		expect(drawImage).toHaveBeenCalledWith(
			bitmap,
			expect.closeTo(1),
			expect.closeTo(0),
			expect.closeTo(6),
			expect.closeTo(6),
			0,
			0,
			4,
			4
		);
	});

	it('maps a rotated and moved overlay through inverse CSS rotation', () => {
		const image = { width: 400, height: 400 };
		const crop = { x: 150, y: 100, size: 200 };
		const source = mapCropToSource({
			crop,
			container: squareContainer,
			image,
			userScale: 1,
			rotationDeg: 90,
		});
		const unrotated = mapCropToSource({
			crop,
			container: squareContainer,
			image,
			userScale: 1,
			rotationDeg: 0,
		});
		const corners = mapCropCornersToSource({
			crop,
			container: squareContainer,
			image,
			userScale: 1,
			rotationDeg: 90,
		});

		// Without inverse rotation, save would treat screen (150,100) as source (150,100).
		expect(unrotated.sx).toBeCloseTo(150);
		expect(unrotated.sy).toBeCloseTo(100);
		expect(source.sx).toBeCloseTo(100);
		expect(source.sy).toBeCloseTo(250);
		expect(corners[0].x).toBeCloseTo(100);
		expect(corners[0].y).toBeCloseTo(250);
		expect(corners[1].x).toBeCloseTo(100);
		expect(corners[1].y).toBeCloseTo(50);
	});

	it('replays preview rotation when drawing a moved crop', () => {
		const calls: string[] = [];
		const ctx = {
			save: () => calls.push('save'),
			restore: () => calls.push('restore'),
			scale: (...args: number[]) => calls.push(`scale:${args.join(',')}`),
			translate: (...args: number[]) =>
				calls.push(`translate:${args.join(',')}`),
			rotate: (rad: number) => calls.push(`rotate:${rad}`),
			drawImage: jest.fn(),
		} as unknown as CanvasRenderingContext2D;
		const bitmap = {} as CanvasImageSource;
		const crop = { x: 150, y: 100, size: 200 };

		drawPreviewCrop(ctx, bitmap, {
			crop,
			container: squareContainer,
			imageSize: { width: 400, height: 400 },
			userScale: 1,
			rotationDeg: 90,
			outputSize: 512,
		});

		expect(calls).toContain(`rotate:${Math.PI / 2}`);
		expect(calls).toContain('translate:-150,-100');
		expect((ctx.drawImage as jest.Mock).mock.calls[0].slice(1)).toEqual([
			0, 0, 400, 400,
		]);
	});
});
