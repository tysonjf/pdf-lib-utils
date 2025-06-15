import type { Color, PDFFont, PDFPage } from '@cantoo/pdf-lib';

export type TextPart = {
	text: string;
	font: PDFFont;
	fontSize?: number;
	color?: Color;
	opacity?: number;
	newLine?: boolean;
};

function partWidth(part: TextPart, textOverride?: string) {
	const size = part.fontSize || 12;
	return part.font.widthOfTextAtSize(textOverride ?? part.text, size);
}

function splitPartToWords(part: TextPart): TextPart[] {
	// Split at word boundaries, preserving spaces
	const words = part.text.match(/\S+|\s+/g) || [];
	return words.map((word) => ({ ...part, text: word }));
}
/**
 * Convert y from top to y from bottom
 * @example
 * ```ts
 * page.drawImage(image, {
 *   x: 20,
 *   y: yFromTop(page, 30, 200), // 30 is the y from top, 200 is the height of the image
 *   width: 200,
 *   height: 200, // 200 is the height of the image
 *   opacity: 1,
 * });
 * // y = page.getHeight() - 30 - 200 = page.getHeight() - 230
 * ```
 * @param page page
 * @param y desired y from top
 * @param height height of the object
 * @returns calculated y from bottom
 */
function yFromTop(page: PDFPage, y: number, height: number) {
	return page.getHeight() - y - height;
}

export { partWidth, splitPartToWords, yFromTop };
