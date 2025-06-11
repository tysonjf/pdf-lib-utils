import type { Color, PDFFont } from '@cantoo/pdf-lib';

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

export { partWidth, splitPartToWords };
