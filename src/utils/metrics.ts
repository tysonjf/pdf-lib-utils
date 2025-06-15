import type { Color, PDFFont, PDFPage } from '@cantoo/pdf-lib';

/**
 * A fragment of styled text for PDF drawing.
 *
 * @property text The text content
 * @property font The embedded PDFFont to use
 * @property fontSize Optional font size (default: 12)
 * @property color Optional text color
 * @property opacity Optional text opacity
 * @property newLine If true, forces a line break before this part (for drawTextArea)
 */
export type TextPart = {
	text: string;
	font: PDFFont;
	fontSize?: number;
	color?: Color;
	opacity?: number;
	newLine?: boolean;
};

/**
 * Returns the width of a TextPart (or a given string with the part's style) in PDF units.
 *
 * @param part The TextPart to measure
 * @param textOverride Optional string to measure instead of part.text
 * @returns Width in PDF units
 */
function partWidth(part: TextPart, textOverride?: string) {
	const size = part.fontSize || 12;
	return part.font.widthOfTextAtSize(textOverride ?? part.text, size);
}

/**
 * Splits a TextPart into an array of TextParts, one per word (preserving spaces and style).
 *
 * @param part The TextPart to split
 * @returns Array of TextParts, one for each word or space
 */
function splitPartToWords(part: TextPart): TextPart[] {
	// Split at word boundaries, preserving spaces
	const words = part.text.match(/\S+|\s+/g) || [];
	return words.map((word) => ({ ...part, text: word }));
}

/**
 * Convert y from top to y from bottom for PDF-lib drawing.
 *
 * @example
 * page.drawImage(image, {
 *   x: 20,
 *   y: yFromTop(page, 30, 200), // 30 is the y from top, 200 is the height of the image
 *   width: 200,
 *   height: 200,
 *   opacity: 1,
 * });
 * // y = page.getHeight() - 30 - 200 = page.getHeight() - 230
 *
 * @param page The PDFPage
 * @param y Desired y from top
 * @param height Height of the object
 * @returns Calculated y from bottom (for PDF-lib)
 */
function yFromTop(page: PDFPage, y: number, height: number) {
	return page.getHeight() - y - height;
}

export { partWidth, splitPartToWords, yFromTop };
