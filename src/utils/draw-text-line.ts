import {
	cmyk,
	popGraphicsState,
	pushGraphicsState,
	type Color,
	type PDFPage,
} from '@cantoo/pdf-lib';
import type { TextPart } from './metrics';
import { partWidth, splitPartToWords } from './metrics';

export type OnOverflowTextLine = (info: {
	overflowed: boolean;
	overflowX: boolean;
	overflowY: boolean;
	lineWidth: number;
	maxWidth: number;
	lineHeight: number;
	maxHeight: number;
	parts: TextPart[];
	message: string;
}) => void;

export type DrawTextLineParams = {
	parts: TextPart[];
	x: number;
	y: number;
	width: number;
	height: number;
	align?: 'left' | 'center' | 'right' | 'justifyParts' | 'justifyWords';
	verticalAlign?: 'top' | 'middle' | 'bottom';
	color?: Color;
	opacity?: number;
	hideOnOverflow?: boolean;
	onOverflow?: OnOverflowTextLine;
	debugOptions?: {
		debug: boolean;
		rectColor?: Color;
		rectBorderWidth?: number;
		rectOpacity?: number;
	};
	/**
	 * If true (default), isolates graphics state using pushGraphicsState/popGraphicsState so styles do not bleed.
	 */
	isolate?: boolean;
};

/**
 * Draws a single line of styled text parts on a PDF page, with alignment, justification, vertical alignment, overflow handling, and per-part styling.
 *
 * - Y-coordinates are specified from the top of the page (not the bottom).
 * - Each text part can have its own font, size, color, and opacity.
 * - Supports alignment: left, center, right, justify by parts, or justify by words.
 * - No wrapping: if the text does not fit, it is considered overflow.
 * - Handles overflow with options to hide or provide a callback for overflow info.
 * - Optionally draws a debug rectangle around the text line.
 * - By default, isolates graphics state so styles do not bleed into other drawing operations.
 *
 * @param page The PDFPage to draw on.
 * @param params Drawing options:
 *   @param parts Array of TextPart objects (each with text, font, and optional style).
 *   @param x X-coordinate (from left of page).
 *   @param y Y-coordinate (from top of page).
 *   @param width Width of the text line area.
 *   @param height Height of the text line area.
 *   @param align Horizontal alignment: 'left' | 'center' | 'right' | 'justifyParts' | 'justifyWords' (default: 'left').
 *   @param verticalAlign Vertical alignment: 'top' | 'middle' | 'bottom' (default: 'top').
 *   @param color Default text color (overridden by part.color).
 *   @param opacity Default text opacity (overridden by part.opacity).
 *   @param hideOnOverflow If true, hides the line if any overflow occurs.
 *   @param onOverflow Callback invoked with detailed info if overflow occurs.
 *   @param debugOptions If set, draws a rectangle around the text line for debugging.
 *   @param isolate If true (default), isolates graphics state (pushGraphicsState/popGraphicsState).
 *
 * @example
 * drawTextLine(page, {
 *   parts: [
 *     { text: 'Hello', font, fontSize: 12 },
 *     { text: 'World!', font, fontSize: 12 }
 *   ],
 *   x: 20, y: 100, width: 200, height: 30,
 *   align: 'justifyParts',
 *   verticalAlign: 'middle',
 *   onOverflow: (info) => { if (info.overflowed) console.log(info.message); }
 * });
 */
export function drawTextLine(page: PDFPage, params: DrawTextLineParams) {
	const {
		parts,
		x,
		y,
		width,
		height,
		align = 'left',
		verticalAlign = 'top',
		color = cmyk(0, 0, 0, 1),
		opacity = 1,
		hideOnOverflow = false,
		onOverflow,
		debugOptions = { debug: false },
		isolate = true,
	} = params;
	const pageHeight = page.getHeight();
	const boxTop = pageHeight - y;
	const boxLeft = x;
	const boxWidth = width;
	const boxHeight = height;
	const defaultFontSize = 12;

	// Flatten parts into words if justifyWords is used
	let lineParts: TextPart[];
	if (align === 'justifyWords') {
		lineParts = parts.flatMap(splitPartToWords);
	} else {
		lineParts = groupPartsByStyle(parts);
	}

	// Calculate total line width and max font size (for height)
	const partWidths = lineParts.map((p) => partWidth(p));
	const lineWidth = partWidths.reduce((a, b) => a + b, 0);
	const maxFontSize = Math.max(...lineParts.map((p) => p.fontSize || defaultFontSize));
	const lineHeight = maxFontSize; // For single line, height is max font size

	// Overflow detection
	const overflowX = lineWidth > boxWidth;
	const overflowY = lineHeight > boxHeight;
	const overflowed = overflowX || overflowY;
	let message = '';
	if (overflowX && overflowY) {
		message = 'Text overflows both X (width) and Y (height)';
	} else if (overflowX) {
		message = 'Text overflows X (width)';
	} else if (overflowY) {
		message = 'Text overflows Y (height)';
	} else {
		message = 'Text fits within the box';
	}
	if (onOverflow) {
		onOverflow({
			overflowed,
			overflowX,
			overflowY,
			lineWidth,
			maxWidth: boxWidth,
			lineHeight,
			maxHeight: boxHeight,
			parts: lineParts,
			message,
		});
	}

	if (isolate) page.pushOperators(pushGraphicsState());
	if (hideOnOverflow && overflowed) {
		// Optionally draw rectangle around the line
		if (debugOptions.debug) {
			page.drawRectangle({
				x: boxLeft,
				y: boxTop - boxHeight,
				width: boxWidth,
				height: boxHeight,
				borderColor:
					debugOptions.rectColor ?? ({ type: 'RGB', red: 1, green: 0, blue: 0 } as Color),
				borderWidth: debugOptions.rectBorderWidth ?? 1,
				opacity: debugOptions.rectOpacity ?? 0.5,
			});
		}
		if (isolate) page.pushOperators(popGraphicsState());
		return;
	}

	// Alignment and justification
	let xCursor = boxLeft;
	let extraSpace = 0;
	let gapCount = 0;
	let gapWidth = 0;
	if (align === 'center') {
		xCursor = boxLeft + (boxWidth - lineWidth) / 2;
	} else if (align === 'right') {
		xCursor = boxLeft + (boxWidth - lineWidth);
	} else if (align === 'justifyParts' && lineParts.length > 1) {
		gapCount = lineParts.length - 1;
		extraSpace = boxWidth - lineWidth;
		gapWidth = extraSpace / gapCount;
	} else if (align === 'justifyWords' && lineParts.length > 1) {
		gapCount = lineParts.length - 1;
		extraSpace = boxWidth - lineWidth;
		gapWidth = extraSpace / gapCount;
	}

	// Vertical alignment
	let yText = boxTop;
	if (verticalAlign === 'middle') {
		yText = boxTop - (boxHeight - lineHeight) / 2;
	} else if (verticalAlign === 'bottom') {
		yText = boxTop - (boxHeight - lineHeight);
	}
	// Default is 'top', which is boxTop

	// Draw each part
	for (let i = 0; i < lineParts.length; i++) {
		const part = lineParts[i];
		const partFontSize = part.fontSize || defaultFontSize;
		page.drawText(part.text, {
			x: xCursor,
			y: yText - (maxFontSize - partFontSize) - partFontSize,
			font: part.font,
			size: partFontSize,
			color: part.color ?? color,
			opacity: part.opacity ?? opacity,
		});
		xCursor += partWidths[i];
		if (
			(align === 'justifyParts' || align === 'justifyWords') &&
			i < lineParts.length - 1
		) {
			xCursor += gapWidth;
		}
	}

	// Optionally draw rectangle around the line
	if (debugOptions.debug) {
		page.drawRectangle({
			x: boxLeft,
			y: boxTop - boxHeight,
			width: boxWidth,
			height: boxHeight,
			borderColor:
				debugOptions.rectColor ?? ({ type: 'RGB', red: 1, green: 0, blue: 0 } as Color),
			borderWidth: debugOptions.rectBorderWidth ?? 1,
			opacity: debugOptions.rectOpacity ?? 0.5,
		});
	}
	if (isolate) page.pushOperators(popGraphicsState());
}

// Helper to group consecutive TextParts with the same style (copied from draw-text-area)
function groupPartsByStyle(parts: TextPart[]): TextPart[] {
	const grouped: TextPart[] = [];
	let current: TextPart | null = null;
	for (const part of parts) {
		if (
			current &&
			part.font === current.font &&
			part.fontSize === current.fontSize &&
			JSON.stringify(part.color) === JSON.stringify(current.color) &&
			part.opacity === current.opacity
		) {
			current.text += part.text;
		} else {
			if (current) grouped.push(current);
			current = { ...part };
		}
	}
	if (current) grouped.push(current);
	return grouped;
}
