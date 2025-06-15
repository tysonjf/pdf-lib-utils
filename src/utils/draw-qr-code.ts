import {
	cmyk,
	popGraphicsState,
	pushGraphicsState,
	type Color,
	type PDFPage,
} from '@cantoo/pdf-lib';
import * as QRCode from 'qrcode';
import { PathBuilder } from './pathBuilder';

/**
 * Options for drawing a QR code on a PDF page.
 *
 * @property data The string to encode in the QR code
 * @property x X-coordinate (from left of page)
 * @property y Y-coordinate (from top by default; see fromTop)
 * @property width Width of the QR code area
 * @property height Height of the QR code area
 * @property border Optional border color
 * @property borderWidth Optional border width
 * @property background Optional background color (default: transparent)
 * @property backgroundOpacity Optional background opacity (default: 1)
 * @property foreground Optional QR square color (default: black)
 * @property foregroundOpacity Optional QR square opacity (default: 1)
 * @property margin Optional margin between QR code and border (default: 10)
 * @property radius Optional corner radius for background rectangle (default: 0)
 * @property forgroundRadius Optional corner radius for each QR square (default: 0)
 * @property dashArray Optional border dash pattern
 * @property dashPhase Optional border dash phase
 * @property fromTop If true (default), y is from top; if false, y is from bottom
 * @property isolate If true (default), isolates graphics state for this QR code
 */
export interface QRCodeOptions {
	data: string;
	x: number;
	y: number;
	width: number;
	height: number;
	border?: Color;
	borderWidth?: number;
	background?: Color;
	backgroundOpacity?: number;
	foreground?: Color;
	foregroundOpacity?: number;
	margin?: number;
	radius?: number;
	forgroundRadius?: number;
	dashArray?: number[];
	dashPhase?: number;
	fromTop?: boolean;
	isolate?: boolean;
}

/**
 * Draw a QR code on a PDF page with customizable size, colors, border, margin, and corner radius.
 *
 * - Uses the [qrcode](https://www.npmjs.com/package/qrcode) package to generate the QR code matrix.
 * - All coordinates are y-from-top by default (set fromTop to false for y-from-bottom).
 * - By default, isolates graphics state so styles do not bleed into other drawing operations.
 *
 * @param page The PDFPage to draw on
 * @param options QRCodeOptions (see type for all options)
 * @returns Promise<void>
 *
 * @example
 * await drawQRCode(page, {
 *   data: 'https://www.google.com',
 *   x: 100,
 *   y: 100,
 *   width: 100,
 *   height: 100,
 *   border: cmyk(0, 0, 0, 1),
 *   borderWidth: 1,
 *   background: cmyk(0, 0, 0, 0),
 *   backgroundOpacity: 1,
 *   foreground: cmyk(0, 0, 0, 1),
 *   foregroundOpacity: 1,
 *   margin: 10,
 *   radius: 0,
 *   forgroundRadius: 0,
 *   dashArray: [1, 10],
 *   dashPhase: 0,
 * });
 */
export async function drawQRCode(page: PDFPage, options: QRCodeOptions) {
	const {
		data,
		x,
		y,
		width,
		height,
		border,
		borderWidth,
		background = cmyk(0, 0, 0, 0),
		backgroundOpacity = 1,
		foreground = cmyk(0, 0, 0, 1),
		foregroundOpacity = 1,
		margin = 10,
		radius = 0,
		forgroundRadius = 0,
		dashArray,
		dashPhase,
		fromTop = true,
		isolate = true,
	} = options;

	// 1. Generate QR code matrix
	const qr = QRCode.create(data, { errorCorrectionLevel: 'M' });
	const modules = qr.modules;
	const moduleCount = modules.size;

	// Calculate the area for the QR code squares (inset by margin)
	const qrX = x + margin;
	const qrY = y + margin;
	const qrWidth = width - 2 * margin;
	const qrHeight = height - 2 * margin;
	const cellWidth = qrWidth / moduleCount;
	const cellHeight = qrHeight / moduleCount;

	// 2. Draw background with border and radius using PathBuilder
	PathBuilder.rectPath(page, {
		x,
		y,
		width,
		height,
		radius,
		fill: background,
		fillOpacity: backgroundOpacity,
		stroke: border,
		strokeWidth: borderWidth,
		strokeOpacity: 1,
		dashArray,
		dashPhase,
		fromTop,
		isolate,
	}).pushOperators();

	// 3. Draw each module
	for (let row = 0; row < moduleCount; row++) {
		for (let col = 0; col < moduleCount; col++) {
			if (modules.get(row, col)) {
				PathBuilder.rectPath(page, {
					x: qrX + col * cellWidth,
					y: qrY + cellHeight * (moduleCount - 1 - row),
					width: cellWidth,
					height: cellHeight,
					radius: forgroundRadius,
					fill: foreground,
					fillOpacity: foregroundOpacity,
					fromTop,
					isolate,
				}).pushOperators();
			}
		}
	}
}
