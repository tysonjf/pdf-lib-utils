import { PDFImage, PDFPage, popGraphicsState, rgb } from '@cantoo/pdf-lib';
import { PathBuilder } from './pathBuilder';

export type DrawImageAreaOptions = {
	clipShape?: 'rect' | 'ellipse'; // default: 'rect'
	fit?: 'cover' | 'contain' | 'fill'; // default: 'cover'
	offsetX?: number; // -1 to 1, percent from center, default 0
	offsetY?: number; // -1 to 1, percent from center, default 0
	opacity?: number;
	borderRadius?: number; // radius in PDF units (points)
	debug?: boolean; // draw the clip area border
};

/**
 * Draws an image clipped to a rect or ellipse, with fitting and offset options.
 * @param page PDFPage
 * @param image PDFImage (from embedPng/embedJpg)
 * @param x left of clip area
 * @param y top of clip area (from top of page)
 * @param width width of clip area
 * @param height height of clip area
 * @param options DrawImageAreaOptions
 */
export function drawImageArea(
	page: PDFPage,
	image: PDFImage,
	x: number,
	y: number,
	width: number,
	height: number,
	options: DrawImageAreaOptions = {}
) {
	const pageHeight = page.getHeight();
	const boxLeft = x;
	const boxTop = pageHeight - y;
	const boxWidth = width;
	const boxHeight = height;
	const boxBottom = boxTop - boxHeight;

	const {
		clipShape = 'rect',
		fit = 'cover',
		offsetX = 0,
		offsetY = 0,
		opacity = 1,
		borderRadius = 0,
		debug = false,
	} = options;

	// 1. Push clipping path
	if (clipShape === 'ellipse') {
		page.pushOperators(
			...PathBuilder.ellipseClip(
				boxLeft + boxWidth / 2,
				boxTop - boxHeight / 2,
				boxWidth / 2,
				boxHeight / 2
			)
		);
	} else if (borderRadius && borderRadius > 0) {
		page.pushOperators(
			...PathBuilder.roundedRectClip(
				boxLeft,
				boxTop - boxHeight,
				boxWidth,
				boxHeight,
				borderRadius
			)
		);
	} else {
		page.pushOperators(
			...PathBuilder.rectClip(boxLeft, boxTop - boxHeight, boxWidth, boxHeight)
		);
	}

	// 1. Compute image fitting (fit: cover/contain/fill)
	const imgW = image.width;
	const imgH = image.height;
	const areaW = boxWidth;
	const areaH = boxHeight;
	let drawW = areaW,
		drawH = areaH;
	let scale = 1;

	if (fit === 'cover') {
		const scaleW = areaW / imgW;
		const scaleH = areaH / imgH;
		scale = Math.max(scaleW, scaleH);
		drawW = imgW * scale;
		drawH = imgH * scale;
	} else if (fit === 'contain') {
		const scaleW = areaW / imgW;
		const scaleH = areaH / imgH;
		scale = Math.min(scaleW, scaleH);
		drawW = imgW * scale;
		drawH = imgH * scale;
	} else if (fit === 'fill') {
		drawW = areaW;
		drawH = areaH;
	}

	// 2. Calculate x, y to center the image in the area (bottom-left origin)
	// const overflowX = drawW - areaW;
	// const overflowY = drawH - areaH;

	// Center of the area
	const areaCenterX = boxLeft + boxWidth / 2;
	const areaCenterY = boxBottom + boxHeight / 2;

	// Offset in px (relative to image size)
	const offsetXPx = (offsetX ?? 0) * (drawW / 2);
	const offsetYPx = (offsetY ?? 0) * (drawH / 2);

	// Final image position (bottom-left corner)
	let drawX = areaCenterX - drawW / 2 + offsetXPx;
	let drawY = areaCenterY - drawH / 2 + offsetYPx;

	// 3. Apply offset (offsetX/Y: -1 to 1, percent of area size)
	// offsetX = -1 is left, 1 is right; offsetY = -1 is bottom, 1 is top
	// The offset is a percentage of the area size (not the overflow)
	if (offsetX) {
		drawX += (offsetX * areaW) / 2;
	}
	if (offsetY) {
		drawY += (offsetY * areaH) / 2;
	}

	// 4. (Future) Apply scale here if needed

	// 5. Draw image
	page.drawImage(image, {
		x: drawX,
		y: drawY,
		width: drawW,
		height: drawH,
		opacity,
	});

	// 6. Optionally draw debug border
	if (debug) {
		if (clipShape === 'ellipse') {
			page.drawEllipse({
				x: boxLeft + boxWidth / 2,
				y: boxTop - boxHeight / 2,
				xScale: boxWidth / 2,
				yScale: boxHeight / 2,
				borderColor: rgb(1, 0, 0),
				borderWidth: 1,
				opacity: 0.5,
			});
		} else if (borderRadius && borderRadius > 0) {
			// Draw rounded rect border
			page.pushOperators(
				...PathBuilder.roundedRectPath(
					boxLeft,
					boxTop - boxHeight,
					boxWidth,
					boxHeight,
					borderRadius
				).getOperators()
			);
			page.drawRectangle({
				x: boxLeft,
				y: boxTop - boxHeight,
				width: boxWidth,
				height: boxHeight,
				borderColor: rgb(1, 0, 0),
				borderWidth: 1,
				opacity: 0.5,
			});
		} else {
			page.drawRectangle({
				x: boxLeft,
				y: boxTop - boxHeight,
				width: boxWidth,
				height: boxHeight,
				borderColor: rgb(1, 0, 0),
				borderWidth: 1,
				opacity: 0.5,
			});
		}
	}

	// 7. Pop graphics state
	page.pushOperators(popGraphicsState());
}
