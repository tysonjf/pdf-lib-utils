import type { Color, PDFPage } from '@cantoo/pdf-lib';
import { rgb } from '@cantoo/pdf-lib';
import type { TextPart } from './text-metrics';
import { partWidth, splitPartToWords } from './text-metrics';

export type DrawTextAreaOptions = {
	align?: 'left' | 'center' | 'right';
	verticalAlign?: 'top' | 'middle' | 'bottom';
	autoWrap?: boolean;
	lineHeight?: number;
	color?: Color;
	opacity?: number;
	clipOverflow?: boolean;
	hideOnOverflow?: boolean;
	onOverflow?: (info: {
		overflowedLines: TextPart[][];
		overflowedLineIndices: number[];
		totalLines: number;
		renderedLines: number;
		overflowed: boolean;
		overflowX: boolean;
		overflowY: boolean;
		message: string;
	}) => void;
};

/**
 * Draws text parts in a rectangular area (multi-line, wrapping, no justification).
 */
export function drawTextArea(
	page: PDFPage,
	parts: TextPart[],
	x: number,
	y: number,
	width: number,
	height: number,
	options: DrawTextAreaOptions = {},
	drawRect: boolean = false
) {
	const pageHeight = page.getHeight();
	const boxTop = pageHeight - y;
	const boxLeft = x;
	const boxWidth = width;
	const boxHeight = height;

	const autoWrap = options.autoWrap !== false;
	const align = options.align || 'left';
	const lineHeight = options.lineHeight || 1.2;
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
	const renderLines =
		options.clipOverflow && !fitsAll ? lines.slice(0, lastLineIdx) : lines;
	const overflowedLines =
		options.clipOverflow && !fitsAll ? lines.slice(lastLineIdx) : [];
	const overflowedLineIndices =
		options.clipOverflow && !fitsAll
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

	if (options.onOverflow && overflowed) {
		options.onOverflow({
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

	if (options.hideOnOverflow && overflowed) {
		// Optionally draw rectangle around text area
		if (drawRect) {
			page.drawRectangle({
				x: boxLeft,
				y: boxTop - boxHeight,
				width: boxWidth,
				height: boxHeight,
				borderColor: rgb(0, 0.5, 1),
				borderWidth: 1,
				opacity: 0.5,
			});
		}
		return;
	}

	// 4. Vertical alignment
	const renderLineHeights = renderLines.map((line) =>
		Math.max(...line.map((p) => (p.fontSize || defaultFontSize) * lineHeight))
	);
	const renderTextHeight = renderLineHeights.reduce((a, b) => a + b, 0);
	let startY = boxTop;
	if (options.verticalAlign === 'middle') {
		startY = boxTop - (boxHeight - renderTextHeight) / 2;
	} else if (options.verticalAlign === 'bottom') {
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
				color: part.color ?? options.color,
				opacity: part.opacity ?? options.opacity,
			});
			xCursor += partWidth(part);
		}
		yCursor -= lh;
	}

	// 6. Draw rectangle around text area
	if (drawRect) {
		page.drawRectangle({
			x: boxLeft,
			y: boxTop - boxHeight,
			width: boxWidth,
			height: boxHeight,
			borderColor: rgb(0, 0.5, 1),
			borderWidth: 1,
			opacity: 0.5,
		});
	}
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
