import { cmyk, grayscale, rgb, type PDFFont } from '@cantoo/pdf-lib';
import type { DrawTextAreaOptions } from '../utils/draw-text-area';
import type { TextPart } from '../utils/text-metrics';

export function sampleTextParts1(font: PDFFont): TextPart[] {
	return [
		{ text: 'Hello,', font, fontSize: 24, color: rgb(0.2, 0.4, 1) },
		{ text: 'world!', font, fontSize: 24, color: cmyk(0, 1, 0, 0) }, // magenta CMYK
		{
			text: 'This is a long line that should wrap automatically if it does not fit on one line.',
			font,
			fontSize: 14,
			color: grayscale(0.3),
			opacity: 0.8,
		},
		{
			text: 'New line here. ',
			font,
			newLine: true,
			fontSize: 18,
			color: rgb(0, 0.8, 0.4),
		},
		{
			text: 'same new line as the previous line. ',
			font,
			fontSize: 14,
			color: cmyk(1, 0.5, 0, 0.2),
		},
		{ text: 'and this continues after.', font, fontSize: 14, color: grayscale(0.7) },
		{
			text: 'Another forced new line.',
			font,
			newLine: true,
			fontSize: 16,
			color: cmyk(0.2, 0.8, 0, 0.1),
		},
		{ text: 'Short.', font, fontSize: 12, color: rgb(0, 0, 0) },
		{
			text: 'A very very very very very very very very very very long wordthatshouldwrap.',
			font,
			fontSize: 12,
			color: cmyk(0.7, 0.2, 0, 0.5),
		},
	];
}

export function sampleTextParts2(font: PDFFont): TextPart[] {
	return [
		{ text: 'Justify', font, fontSize: 18, color: rgb(0.2, 0.4, 1) },
		{ text: 'these', font, fontSize: 18, color: cmyk(0, 1, 0, 0) },
		{ text: 'parts', font, fontSize: 18, color: grayscale(0.5) },
		{ text: 'across', font, fontSize: 18, color: rgb(1, 0.6, 0) },
		{ text: 'the', font, fontSize: 18, color: cmyk(0.2, 0.8, 0, 0.1) },
		{ text: 'line.', font, fontSize: 18, color: grayscale(0.2) },
		{ text: 'New line', font, newLine: true, fontSize: 18, color: rgb(0.2, 0.4, 1) },
		{ text: 'and', font, fontSize: 18, color: cmyk(0.7, 0.2, 0, 0.5) },
		{ text: 'continue.', font, fontSize: 18, color: grayscale(0.8) },
	];
}

export function sampleTextParts3(font: PDFFont): TextPart[] {
	return [
		{ text: 'Justify', font, fontSize: 14, color: rgb(0.2, 0.4, 1) },
		{ text: 'words', font, fontSize: 14, color: cmyk(0, 1, 0, 0) },
		{
			text: 'across the line for a more natural look.',
			font,
			fontSize: 14,
			color: grayscale(0.3),
		},
		{ text: 'New line', font, newLine: true, fontSize: 14, color: rgb(1, 0.6, 0) },
		{
			text: 'and continue with more words to wrap and justify.',
			font,
			fontSize: 14,
			color: cmyk(0.2, 0.8, 0, 0.1),
		},
	];
}

export function sampleTextParts4(font: PDFFont): TextPart[] {
	return [
		{ text: 'Mobile', font, fontSize: 12, color: cmyk(0, 0, 0, 1), opacity: 0.5 },
		{ text: '0403 123 456', font, fontSize: 12, color: cmyk(0, 0, 0, 1) },
		// new line
		{
			text: 'Email',
			font,
			fontSize: 12,
			color: cmyk(0, 0, 0, 1),
			newLine: true,
			opacity: 0.5,
		},
		{ text: 'hello@example.com', font, fontSize: 12, color: cmyk(0, 0, 0, 1) },
		// new line
		{
			text: 'Address',
			font,
			fontSize: 12,
			color: cmyk(0, 0, 0, 1),
			newLine: true,
			opacity: 0.5,
		},
		{ text: '123 Main St, Anytown, USA', font, fontSize: 12, color: cmyk(0, 0, 0, 1) },
	];
}

export function sampleTextPartsOverflow(font: PDFFont): TextPart[] {
	// 30 lines, each with newLine:true, to guarantee overflow in most containers
	const arr: TextPart[] = [];
	for (let i = 1; i <= 30; i++) {
		arr.push({
			text: `Overflow line ${i} - Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
			font,
			fontSize: 18,
			color: i % 2 === 0 ? cmyk(0, 1, 0, 0) : grayscale(0.2 + (i % 5) * 0.15),
			newLine: true,
		});
	}
	return arr;
}

export const sampleTextOptions: DrawTextAreaOptions[] = [
	{ autoWrap: true, align: 'left', verticalAlign: 'top', lineHeight: 1.5 },
	{ autoWrap: true, align: 'center', verticalAlign: 'middle', lineHeight: 1.5 },
	{
		autoWrap: true,
		align: 'right',
		verticalAlign: 'bottom',
		lineHeight: 1.5,
	},
];

export const sampleTextOptionsOverflow: DrawTextAreaOptions = {
	autoWrap: true,
	align: 'left',
	verticalAlign: 'top',
	lineHeight: 2,
	clipOverflow: true,
	onOverflow: ({ overflowedLines, overflowedLineIndices, totalLines, renderedLines }) => {
		if (overflowedLines.length > 0) {
			console.log(
				`Text overflow: ${
					totalLines - renderedLines
				} line(s) not rendered. (Indices: ${overflowedLineIndices.join(', ')})`
			);
			const allText = overflowedLines
				.map((line) => line.map((p) => p.text).join(' '))
				.join(' ');
			console.log('Overflowed text:', allText);
		}
	},
};

export const sampleRects: {
	x: number;
	y: number;
	width: number;
	height: number;
	options: {
		strokeWidth?: number;
		strokeColor?: string | [number, number, number] | [number, number, number, number];
		fillColor?: string | [number, number, number] | [number, number, number, number];
	};
}[] = [
	// stroked sample around the text
	{
		x: 20,
		y: 30,
		width: 170,
		height: 200,
		options: { strokeColor: '#3366ff', strokeWidth: 2, fillColor: '#e0e0e0' },
	},
	// {
	// 	x: 10,
	// 	y: 10,
	// 	width: 50,
	// 	height: 30,
	// 	options: { strokeColor: '#3366ff', strokeWidth: 2, fillColor: '#e0e0e0' },
	// },
	// {
	// 	x: 70,
	// 	y: 20,
	// 	width: 40,
	// 	height: 40,
	// 	options: {
	// 		strokeColor: [1, 0, 0] as [number, number, number],
	// 		strokeWidth: 1,
	// 		fillColor: [0.9, 0.9, 0.2] as [number, number, number],
	// 	},
	// },
	// {
	// 	x: 30,
	// 	y: 60,
	// 	width: 100,
	// 	height: 20,
	// 	options: {
	// 		strokeColor: [0, 0, 0, 1] as [number, number, number, number],
	// 		strokeWidth: 3,
	// 	},
	// },
	// { x: 120, y: 100, width: 60, height: 60, options: { fillColor: '#ff9900' } },
];
