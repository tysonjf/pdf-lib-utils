import {
	cmyk,
	popGraphicsState,
	pushGraphicsState,
	type Color,
	type PDFPage,
} from '@cantoo/pdf-lib';
import type { TextPart } from './text-metrics';
import { partWidth, splitPartToWords } from './text-metrics';

export type OnOverflow = (info: {
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
	onOverflow?: OnOverflow;
	debugOptions?: {
		debug: boolean;
		rectColor?: Color;
		rectBorderWidth?: number;
		rectOpacity?: number;
	};
};

/**
 * Draws a single line of text parts, with alignment and justification options. No wrapping.
 * Now also checks for vertical (y) overflow and supports verticalAlign.
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

	page.pushOperators(pushGraphicsState());
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
		page.pushOperators(popGraphicsState());
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
	page.pushOperators(popGraphicsState());
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
