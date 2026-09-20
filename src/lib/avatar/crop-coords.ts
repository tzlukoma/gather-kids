/**
 * Map a square crop overlay (container CSS pixels) onto a source image that is
 * previewed with object-contain (centered, letterboxed) plus an optional user zoom.
 *
 * The preview must NOT also apply the contain scale as a CSS transform — that
 * double-counts fit and shifts 4:3 / portrait photos. Zoom is a separate
 * multiplier around the container centre.
 */

export type Size = {
	width: number;
	height: number;
};

export type CropRect = {
	x: number;
	y: number;
	size: number;
};

export type ContainedLayout = {
	fitScale: number;
	fittedWidth: number;
	fittedHeight: number;
	offsetX: number;
	offsetY: number;
};

export type SourceSquare = {
	sx: number;
	sy: number;
	sSize: number;
};

export function containedLayout(container: Size, image: Size): ContainedLayout {
	if (container.width <= 0 || container.height <= 0 || image.width <= 0 || image.height <= 0) {
		return {
			fitScale: 1,
			fittedWidth: 0,
			fittedHeight: 0,
			offsetX: 0,
			offsetY: 0,
		};
	}

	const fitScale = Math.min(
		container.width / image.width,
		container.height / image.height
	);
	const fittedWidth = image.width * fitScale;
	const fittedHeight = image.height * fitScale;

	return {
		fitScale,
		fittedWidth,
		fittedHeight,
		offsetX: (container.width - fittedWidth) / 2,
		offsetY: (container.height - fittedHeight) / 2,
	};
}

export function initialCenteredSquareCrop(layout: ContainedLayout): CropRect {
	const size = Math.min(layout.fittedWidth, layout.fittedHeight);
	return {
		x: layout.offsetX + (layout.fittedWidth - size) / 2,
		y: layout.offsetY + (layout.fittedHeight - size) / 2,
		size,
	};
}

/**
 * Inverse of `transform: scale(userScale)` around the container centre, then
 * undo object-contain letterboxing to reach natural image pixels.
 */
export function mapCropToSource({
	crop,
	container,
	image,
	userScale,
}: {
	crop: CropRect;
	container: Size;
	image: Size;
	userScale: number;
}): SourceSquare {
	const layout = containedLayout(container, image);
	const scale = userScale > 0 ? userScale : 1;
	const centerX = container.width / 2;
	const centerY = container.height / 2;

	const wrapperX = centerX + (crop.x - centerX) / scale;
	const wrapperY = centerY + (crop.y - centerY) / scale;
	const wrapperSize = crop.size / scale;

	return {
		sx: (wrapperX - layout.offsetX) / layout.fitScale,
		sy: (wrapperY - layout.offsetY) / layout.fitScale,
		sSize: wrapperSize / layout.fitScale,
	};
}

export function clampSourceSquare(
	source: SourceSquare,
	image: Size
): SourceSquare {
	const sSize = Math.min(Math.max(source.sSize, 0), image.width, image.height);
	const sx = Math.min(Math.max(source.sx, 0), Math.max(0, image.width - sSize));
	const sy = Math.min(Math.max(source.sy, 0), Math.max(0, image.height - sSize));
	return { sx, sy, sSize };
}

export function displayedImageBounds(
	container: Size,
	image: Size,
	userScale: number
): CropRect & { width: number; height: number } {
	const layout = containedLayout(container, image);
	const scale = userScale > 0 ? userScale : 1;
	const centerX = container.width / 2;
	const centerY = container.height / 2;

	return {
		x: centerX + (layout.offsetX - centerX) * scale,
		y: centerY + (layout.offsetY - centerY) * scale,
		size: 0,
		width: layout.fittedWidth * scale,
		height: layout.fittedHeight * scale,
	};
}

export function clampCropToVisibleImage(
	crop: CropRect,
	container: Size,
	image: Size,
	userScale: number
): CropRect {
	const disp = displayedImageBounds(container, image, userScale);
	const left = Math.max(0, disp.x);
	const top = Math.max(0, disp.y);
	const right = Math.min(container.width, disp.x + disp.width);
	const bottom = Math.min(container.height, disp.y + disp.height);
	const availW = Math.max(0, right - left);
	const availH = Math.max(0, bottom - top);
	const size = Math.min(crop.size, availW, availH);

	return {
		x: Math.min(Math.max(crop.x, left), Math.max(left, right - size)),
		y: Math.min(Math.max(crop.y, top), Math.max(top, bottom - size)),
		size,
	};
}

export function drawSquareCrop(
	ctx: CanvasRenderingContext2D,
	image: CanvasImageSource,
	source: SourceSquare,
	outputSize: number
): void {
	ctx.drawImage(
		image,
		source.sx,
		source.sy,
		source.sSize,
		source.sSize,
		0,
		0,
		outputSize,
		outputSize
	);
}
