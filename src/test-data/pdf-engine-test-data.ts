import { cmyk, grayscale, rgb, type PDFFont } from '@cantoo/pdf-lib';
import type { DrawTextPartsOptions, TextPart } from '../utils/text-utils';

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
			text: 'New line here.',
			font,
			newLine: true,
			fontSize: 18,
			color: rgb(0, 0.8, 0.4),
		},
		{
			text: 'This should be on a new line,',
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

export const sampleTextOptions: DrawTextPartsOptions[] = [
	{ wrap: true, align: 'left', verticalAlign: 'top', lineHeight: 2 },
	{ wrap: true, align: 'center', verticalAlign: 'top' },
	{ wrap: true, align: 'right', verticalAlign: 'top' },
	{ wrap: true, align: 'justify-parts', verticalAlign: 'top' },
	{ wrap: true, align: 'justify-words', verticalAlign: 'top' },
];

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
