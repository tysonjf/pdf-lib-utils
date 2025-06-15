import {
	cmyk,
	type Color,
	type PDFPage,
	popGraphicsState,
	pushGraphicsState,
} from '@cantoo/pdf-lib';
import type { TextPart } from './metrics';
import { partWidth, splitPartToWords } from './metrics';

export type OnOverflowTextArea = (info: {
	overflowedLines: TextPart[][];
	overflowedLineIndices: number[];
	totalLines: number;
	renderedLines: number;
	overflowed: boolean;
	overflowX: boolean;
	overflowY: boolean;
	message: string;
}) => void;

export type DrawTextAreaParams = {
	parts: TextPart[];
	x: number;
	y: number;
	width: number;
	height: number;
	align?: 'left' | 'center' | 'right';
	verticalAlign?: 'top' | 'middle' | 'bottom';
	autoWrap?: boolean;
	lineHeight?: number;
	color?: Color;
	opacity?: number;
	clipOverflow?: boolean;
	hideOnOverflow?: boolean;
	onOverflow?: OnOverflowTextArea;
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
 * Draws styled text parts in a rectangular area on a PDF page, supporting multi-line, word-wrapped text with alignment, vertical alignment, overflow handling, and per-part styling.
 *
 * - Y-coordinates are specified from the top of the page (not the bottom).
 * - Each text part can have its own font, size, color, opacity, and can force a line break with `newLine: true`.
 * - Handles overflow with options to hide, clip, or provide a callback for overflow info.
 * - Optionally draws a debug rectangle around the text area.
 * - By default, isolates graphics state so styles do not bleed into other drawing operations.
 *
 * @param page The PDFPage to draw on.
 * @param params Drawing options:
 *   @param parts Array of TextPart objects (each with text, font, and optional style).
 *   @param x X-coordinate (from left of page).
 *   @param y Y-coordinate (from top of page).
 *   @param width Width of the text area.
 *   @param height Height of the text area.
 *   @param align Horizontal alignment: 'left' | 'center' | 'right' (default: 'left').
 *   @param verticalAlign Vertical alignment: 'top' | 'middle' | 'bottom' (default: 'top').
 *   @param autoWrap If true (default), wraps text to fit width.
 *   @param lineHeight Line height multiplier (default: 1.2).
 *   @param color Default text color (overridden by part.color).
 *   @param opacity Default text opacity (overridden by part.opacity).
 *   @param clipOverflow If true, only renders lines that fit in height (clips overflow).
 *   @param hideOnOverflow If true, hides all text if any overflow occurs.
 *   @param onOverflow Callback invoked with detailed info if overflow occurs.
 *   @param debugOptions If set, draws a rectangle around the text area for debugging.
 *   @param isolate If true (default), isolates graphics state (pushGraphicsState/popGraphicsState).
 *
 * @example
 * drawTextArea(page, {
 *   parts: [
 *     { text: 'Hello, ', font, fontSize: 14 },
 *     { text: 'world!', font, fontSize: 14, color: cmyk(0,1,0,0) },
 *     { text: 'New line', font, newLine: true, fontSize: 10 }
 *   ],
 *   x: 20, y: 100, width: 200, height: 100,
 *   align: 'center', verticalAlign: 'middle',
 *   onOverflow: (info) => { if (info.overflowed) console.log(info.message); }
 * });
 */
export function drawTextArea(page: PDFPage, params: DrawTextAreaParams) {
	const {
		parts,
		x,
		y,
		width,
		height,
		align = 'left',
		verticalAlign = 'top',
		autoWrap = true,
		lineHeight = 1.2,
		color = cmyk(0, 0, 0, 1),
		opacity = 1,
		clipOverflow = false,
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

	// 1. Process all parts as a word stream, always splitting into words, and using newLine:true as a forced line break
	const lines: TextPart[][] = [];
	let currentLine: TextPart[] = [];
	let currentLineWidth = 0;
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (part.newLine) {
			if (currentLine.length > 0) {
				lines.push(currentLine);
			}
			currentLine = [];
			currentLineWidth = 0;
		}
		const words = splitPartToWords(part);
		for (let wordIdx = 0; wordIdx < words.length; wordIdx++) {
			const word = words[wordIdx];
			const wordWidth = partWidth(word);
			if (autoWrap && currentLineWidth + wordWidth > boxWidth && currentLine.length > 0) {
				lines.push(currentLine);
				currentLine = [];
				currentLineWidth = 0;
			}
			currentLine.push(word);
			currentLineWidth += wordWidth;
		}
	}
	if (currentLine.length > 0) lines.push(currentLine);

	// 3. Calculate total text height and which lines fit
	const lineHeights = lines.map((line) =>
		Math.max(...line.map((p) => (p.fontSize || defaultFontSize) * lineHeight))
	);
	let totalTextHeight = 0;
	let lastLineIdx = -1;
	for (let idx = 0; idx < lineHeights.length; idx++) {
		totalTextHeight += lineHeights[idx];
		if (totalTextHeight > boxHeight && lastLineIdx === -1) {
			lastLineIdx = idx;
		}
	}
	const fitsAll = lastLineIdx === -1;
	const renderLines = clipOverflow && !fitsAll ? lines.slice(0, lastLineIdx) : lines;
	const overflowedLines = clipOverflow && !fitsAll ? lines.slice(lastLineIdx) : [];
	const overflowedLineIndices =
		clipOverflow && !fitsAll
			? Array.from({ length: lines.length - lastLineIdx }, (_, i) => i + lastLineIdx)
			: [];

	// Overflow detection (x/y)
	const overflowY = !fitsAll;
	// For x overflow, check if any line is too wide
	const overflowX = renderLines.some(
		(line) => line.reduce((sum, p) => sum + partWidth(p), 0) > boxWidth
	);
	const overflowed = overflowX || overflowY;
	let message = '';
	if (overflowX && overflowY) message = 'Text overflows both X (width) and Y (height)';
	else if (overflowX) message = 'Text overflows X (width)';
	else if (overflowY) message = 'Text overflows Y (height)';
	else message = 'Text fits within the box';

	if (onOverflow && overflowed) {
		onOverflow({
			overflowedLines,
			overflowedLineIndices,
			totalLines: lines.length,
			renderedLines: renderLines.length,
			overflowed,
			overflowX,
			overflowY,
			message,
		});
	}

	if (isolate) page.pushOperators(pushGraphicsState());
	if (hideOnOverflow && overflowed) {
		// Optionally draw rectangle around text area
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

	// 4. Vertical alignment
	const renderLineHeights = renderLines.map((line) =>
		Math.max(...line.map((p) => (p.fontSize || defaultFontSize) * lineHeight))
	);
	const renderTextHeight = renderLineHeights.reduce((a, b) => a + b, 0);
	let startY = boxTop;
	if (verticalAlign === 'middle') {
		startY = boxTop - (boxHeight - renderTextHeight) / 2;
	} else if (verticalAlign === 'bottom') {
		startY = boxTop - (boxHeight - renderTextHeight);
	}

	// 5. Draw each line
	let yCursor = startY;
	for (let i = 0; i < renderLines.length; i++) {
		const line = renderLines[i];
		const lh = renderLineHeights[i];
		const groupedLine = groupPartsByStyle(line);
		const lineWidth = groupedLine.reduce((sum, p) => sum + partWidth(p), 0);
		const maxFontSize = Math.max(
			...groupedLine.map((p) => p.fontSize || defaultFontSize)
		);
		let xCursor = boxLeft;
		if (align === 'center') {
			xCursor = boxLeft + (boxWidth - lineWidth) / 2;
		} else if (align === 'right') {
			xCursor = boxLeft + (boxWidth - lineWidth);
		}
		for (const part of groupedLine) {
			const partFontSize = part.fontSize || defaultFontSize;
			page.drawText(part.text, {
				x: xCursor,
				y: yCursor - (maxFontSize - partFontSize) - partFontSize,
				font: part.font,
				size: partFontSize,
				color: part.color ?? color,
				opacity: part.opacity ?? opacity,
			});
			xCursor += partWidth(part);
		}
		yCursor -= lh;
	}

	// 6. Draw rectangle around text area
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

// Helper to group consecutive TextParts with the same style
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
