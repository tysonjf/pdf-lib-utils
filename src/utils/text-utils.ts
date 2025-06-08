import {
	rgb,
	type Color,
	type PDFFont,
	type PDFPage,
	type PDFPageDrawTextOptions,
} from '@cantoo/pdf-lib';

export type TextPart = {
	text: string;
	font: PDFFont;
	fontSize?: number;
	color?: Color;
	opacity?: number;
	newLine?: boolean;
};

export type TextAlign = 'left' | 'center' | 'right' | 'justify-parts' | 'justify-words';
export type VerticalAlign = 'top' | 'middle' | 'bottom';

export type DrawTextPartsOptions = {
	align?: TextAlign;
	verticalAlign?: VerticalAlign;
	wrap?: boolean;
	lineHeight?: number;
	color?: Color;
	opacity?: number;
};

function partWidth(part: TextPart, textOverride?: string) {
	const size = part.fontSize || 12;
	return part.font.widthOfTextAtSize(textOverride ?? part.text, size);
}

function splitPartToFit(part: TextPart, maxWidth: number): TextPart[] {
	// Split at word boundaries if possible
	const words = part.text.split(/(\s+)/);
	const result: TextPart[] = [];
	let current = '';
	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		const test = current + word;
		if (partWidth({ ...part, text: test }) > maxWidth && current) {
			result.push({ ...part, text: current });
			current = word;
		} else {
			current += word;
		}
	}
	if (current) result.push({ ...part, text: current });
	return result;
}

export function drawTextArea(
	page: PDFPage,
	parts: TextPart[],
	x: number,
	y: number,
	width: number,
	height: number,
	options: DrawTextPartsOptions = {},
	drawRect: boolean = false
) {
	const pageHeight = page.getHeight();
	const boxTop = pageHeight - y;
	const boxLeft = x;
	const boxWidth = width;
	const boxHeight = height;

	const wrap = options.wrap !== false;
	const align = options.align || 'left';
	const lineHeight = options.lineHeight || 1.2;
	const defaultFontSize = 12;

	// 1. Build lines
	const lines: TextPart[][] = [];
	let currentLine: TextPart[] = [];
	let currentLineWidth = 0;
	let i = 0;
	while (i < parts.length) {
		let part = parts[i];
		if (part.newLine) {
			if (currentLine.length > 0) {
				lines.push(currentLine);
				currentLine = [];
				currentLineWidth = 0;
			}
			// Start a new line with this part (but don't force it to be alone)
			part = { ...part, newLine: false };
			if (part.text.length > 0) {
				// If the part has text, add it to the new line
				// If it doesn't fit, split it
				if (wrap && partWidth(part) > boxWidth) {
					const split = splitPartToFit(part, boxWidth);
					for (const s of split) {
						if (partWidth(s) > boxWidth) {
							// fallback: force on line
							lines.push([s]);
						} else {
							lines.push([s]);
						}
					}
					currentLine = [];
					currentLineWidth = 0;
				} else {
					currentLine.push(part);
					currentLineWidth = partWidth(part);
				}
			}
			i++;
			continue;
		}
		// Try to fit as many parts as possible on the line
		if (wrap && partWidth(part) > boxWidth) {
			// Split this part into multiple lines
			const split = splitPartToFit(part, boxWidth);
			for (const s of split) {
				if (currentLineWidth + partWidth(s) > boxWidth && currentLine.length > 0) {
					lines.push(currentLine);
					currentLine = [];
					currentLineWidth = 0;
				}
				currentLine.push(s);
				currentLineWidth += partWidth(s);
			}
			i++;
			continue;
		}
		if (currentLineWidth + partWidth(part) > boxWidth && currentLine.length > 0) {
			lines.push(currentLine);
			currentLine = [];
			currentLineWidth = 0;
		}
		currentLine.push(part);
		currentLineWidth += partWidth(part);
		i++;
	}
	if (currentLine.length > 0) lines.push(currentLine);

	// For justify-words, we need to split lines into words
	function lineToWords(line: TextPart[]): { part: TextPart; word: string }[] {
		const words: { part: TextPart; word: string }[] = [];
		for (const part of line) {
			part.text
				.split(/(\s+)/)
				.filter(Boolean)
				.forEach((word) => {
					words.push({ part, word });
				});
		}
		return words;
	}

	// 2. Calculate total text height
	const lineHeights = lines.map((line) =>
		Math.max(...line.map((p) => (p.fontSize || defaultFontSize) * lineHeight))
	);
	const totalTextHeight = lineHeights.reduce((a, b) => a + b, 0);

	// 3. Vertical alignment
	let startY = boxTop;
	if (options.verticalAlign === 'middle') {
		startY = boxTop - (boxHeight - totalTextHeight) / 2;
	} else if (options.verticalAlign === 'bottom') {
		startY = boxTop - (boxHeight - totalTextHeight);
	}

	// 4. Draw each line
	let yCursor = startY;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lh = lineHeights[i];
		const isLastLine = i === lines.length - 1;
		const lineWidth = line.reduce((sum, p) => sum + partWidth(p), 0);
		let xCursor = boxLeft;
		if (align === 'center') {
			xCursor = boxLeft + (boxWidth - lineWidth) / 2;
		} else if (align === 'right') {
			xCursor = boxLeft + (boxWidth - lineWidth);
		}
		if (align === 'justify-parts' && line.length > 1 && !isLastLine) {
			const extraSpace = (boxWidth - lineWidth) / (line.length - 1);
			for (let j = 0; j < line.length; j++) {
				const part = line[j];
				page.drawText(part.text, {
					x: xCursor,
					y: yCursor - (part.fontSize || defaultFontSize),
					font: part.font,
					size: part.fontSize || defaultFontSize,
					color: part.color ?? options.color,
					opacity: part.opacity ?? options.opacity,
				});
				xCursor += partWidth(part) + (j < line.length - 1 ? extraSpace : 0);
			}
		} else if (align === 'justify-words' && !isLastLine) {
			const words = lineToWords(line);
			const wordsWidth = words.reduce(
				(sum, w) =>
					sum + w.part.font.widthOfTextAtSize(w.word, w.part.fontSize || defaultFontSize),
				0
			);
			const spaceWidth = (boxWidth - wordsWidth) / Math.max(1, words.length - 1);
			let xPos = boxLeft;
			for (let k = 0; k < words.length; k++) {
				const { part, word } = words[k];
				page.drawText(word, {
					x: xPos,
					y: yCursor - (part.fontSize || defaultFontSize),
					font: part.font,
					size: part.fontSize || defaultFontSize,
					color: part.color ?? options.color,
					opacity: part.opacity ?? options.opacity,
				});
				xPos += part.font.widthOfTextAtSize(word, part.fontSize || defaultFontSize);
				if (k < words.length - 1) xPos += spaceWidth;
			}
		} else {
			for (const part of line) {
				page.drawText(part.text, {
					x: xCursor,
					y: yCursor - (part.fontSize || defaultFontSize),
					font: part.font,
					size: part.fontSize || defaultFontSize,
					color: part.color ?? options.color,
					opacity: part.opacity ?? options.opacity,
				});
				xCursor += partWidth(part);
			}
		}
		yCursor -= lh;
	}

	// 5. Draw rectangle around text area
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
