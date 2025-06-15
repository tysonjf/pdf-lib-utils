import {
	appendBezierCurve,
	clipEvenOdd,
	closePath,
	ColorTypes,
	endPath,
	fill,
	fillAndStroke,
	lineTo,
	moveTo,
	PDFOperator,
	PDFPage,
	popGraphicsState,
	pushGraphicsState,
	setDashPattern,
	setFillingCmykColor,
	setFillingGrayscaleColor,
	setFillingRgbColor,
	setLineWidth,
	setStrokingCmykColor,
	setStrokingGrayscaleColor,
	setStrokingRgbColor,
	stroke,
	type Color,
} from '@cantoo/pdf-lib';
import { yFromTop } from './metrics';

// --- Types and helpers for new API ---
/**
 * Configuration for drawing a rectangle path on a PDF page.
 *
 * @property x X-coordinate (from left of page)
 * @property y Y-coordinate (from top or bottom, see fromTop)
 * @property width Rectangle width
 * @property height Rectangle height
 * @property radius Optional corner radius
 * @property stroke Optional stroke color
 * @property strokeWidth Optional stroke width
 * @property strokeOpacity Optional stroke opacity
 * @property fill Optional fill color
 * @property fillOpacity Optional fill opacity
 * @property dashArray Optional dash pattern for border
 * @property dashPhase Optional dash phase for border
 * @property fromTop If true (default), y is from top; if false, y is from bottom
 * @property isolate If true (default), isolates graphics state for this path
 */
export type RectConfig = {
	x: number;
	y: number; // from top or bottom depending on fromTop
	width: number;
	height: number;
	radius?: number;
	stroke?: Color;
	strokeWidth?: number;
	strokeOpacity?: number;
	fill?: Color;
	fillOpacity?: number;
	dashArray?: number[];
	dashPhase?: number;
	fromTop?: boolean;
	isolate?: boolean;
};

/**
 * Configuration for drawing an ellipse path on a PDF page.
 *
 * @property x X-coordinate (from left of page)
 * @property y Y-coordinate (from top or bottom, see fromTop)
 * @property xRadius Ellipse x-radius
 * @property yRadius Ellipse y-radius
 * @property stroke Optional stroke color
 * @property strokeWidth Optional stroke width
 * @property strokeOpacity Optional stroke opacity
 * @property fill Optional fill color
 * @property fillOpacity Optional fill opacity
 * @property dashArray Optional dash pattern for border
 * @property dashPhase Optional dash phase for border
 * @property fromTop If true (default), y is from top; if false, y is from bottom
 * @property isolate If true (default), isolates graphics state for this path
 */
export type EllipseConfig = {
	x: number;
	y: number; // from top or bottom depending on fromTop
	xRadius: number;
	yRadius: number;
	stroke?: Color;
	strokeWidth?: number;
	strokeOpacity?: number;
	fill?: Color;
	fillOpacity?: number;
	dashArray?: number[];
	dashPhase?: number;
	fromTop?: boolean;
	isolate?: boolean;
};

/**
 * A chainable builder for PDF path drawing, supporting rectangles, ellipses, lines, and more.
 *
 * Use instance methods to build up a path, then call fill, stroke, or fillAndStroke to set styles.
 * Use getOperators() to retrieve PDF operators, or pushOperators(page, {isolate}) to apply to a page.
 *
 * @example
 * const builder = new PathBuilder()
 *   .moveTo(10, 10)
 *   .lineTo(100, 10)
 *   .lineTo(100, 100)
 *   .closePath()
 *   .fill(cmyk(0,0,0,1));
 * builder.pushOperators(page, {isolate: true});
 */
export class PathBuilder {
	constructor(private readonly operators: PDFOperator[] = []) {}

	moveTo(x: number, y: number) {
		this.operators.push(moveTo(x, y));
		return this;
	}

	lineTo(x: number, y: number) {
		this.operators.push(lineTo(x, y));
		return this;
	}

	closePath() {
		this.operators.push(closePath());
		return this;
	}

	rect(x: number, y: number, width: number, height: number, radius: number = 0) {
		if (radius > 0) {
			const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
			const right = x + width;
			const top = y + height;
			const left = x;
			const bottom = y;
			const KAPPA = 0.5522847498307936; // (4/3)*tan(pi/8)
			const c = r * KAPPA;
			return this.moveTo(left + r, bottom)
				.lineTo(right - r, bottom)
				.appendBezierCurve(
					right - r + c,
					bottom,
					right,
					bottom + r - c,
					right,
					bottom + r
				)
				.lineTo(right, top - r)
				.appendBezierCurve(right, top - r + c, right - r + c, top, right - r, top)
				.lineTo(left + r, top)
				.appendBezierCurve(left + r - c, top, left, top - r + c, left, top - r)
				.lineTo(left, bottom + r)
				.appendBezierCurve(left, bottom + r - c, left + r - c, bottom, left + r, bottom)
				.closePath();
		} else {
			return this.moveTo(x, y)
				.lineTo(x + width, y)
				.lineTo(x + width, y + height)
				.lineTo(x, y + height)
				.closePath();
		}
	}

	ellipse(x: number, y: number, xRadius: number, yRadius: number) {
		const KAPPA = 0.5522847498307936; // (4/3)*tan(pi/8)
		const ox = xRadius * KAPPA;
		const oy = yRadius * KAPPA;
		const xe = x + xRadius;
		const ye = y + yRadius;
		const xs = x - xRadius;
		const ys = y - yRadius;
		return this.moveTo(x, ye)
			.appendBezierCurve(x + ox, ye, xe, y + oy, xe, y)
			.appendBezierCurve(xe, y - oy, x + ox, ys, x, ys)
			.appendBezierCurve(x - ox, ys, xs, y - oy, xs, y)
			.appendBezierCurve(xs, y + oy, x - ox, ye, x, ye)
			.closePath();
	}

	appendBezierCurve(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		x3: number,
		y3: number
	) {
		this.operators.push(appendBezierCurve(x1, y1, x2, y2, x3, y3));
		return this;
	}

	fill(color: Color) {
		if (color?.type === ColorTypes.CMYK) {
			this.operators.push(
				setFillingCmykColor(color.cyan!, color.magenta!, color.yellow!, color.key!)
			);
		} else if (color?.type === ColorTypes.RGB) {
			this.operators.push(setFillingRgbColor(color.red!, color.green!, color.blue!));
		} else if (color?.type === ColorTypes.Grayscale) {
			this.operators.push(setFillingGrayscaleColor(color.gray!));
		}
		this.operators.push(fill());
		return this;
	}

	stroke(color?: Color, width?: number) {
		if (color?.type === ColorTypes.CMYK) {
			this.operators.push(
				setStrokingCmykColor(color.cyan!, color.magenta!, color.yellow!, color.key!)
			);
		} else if (color?.type === ColorTypes.RGB) {
			this.operators.push(setStrokingRgbColor(color.red!, color.green!, color.blue!));
		} else if (color?.type === ColorTypes.Grayscale) {
			this.operators.push(setStrokingGrayscaleColor(color.gray!));
		}
		if (typeof width === 'number') {
			this.operators.push(setLineWidth(width));
		}
		this.operators.push(stroke());
		return this;
	}

	fillAndStroke(fillColor: Color, strokeColor: Color, strokeWidth?: number) {
		if (fillColor?.type === ColorTypes.CMYK) {
			this.operators.push(
				setFillingCmykColor(
					fillColor.cyan!,
					fillColor.magenta!,
					fillColor.yellow!,
					fillColor.key!
				)
			);
		} else if (fillColor?.type === ColorTypes.RGB) {
			this.operators.push(
				setFillingRgbColor(fillColor.red!, fillColor.green!, fillColor.blue!)
			);
		} else if (fillColor?.type === ColorTypes.Grayscale) {
			this.operators.push(setFillingGrayscaleColor(fillColor.gray!));
		}
		if (strokeColor?.type === ColorTypes.CMYK) {
			this.operators.push(
				setStrokingCmykColor(
					strokeColor.cyan!,
					strokeColor.magenta!,
					strokeColor.yellow!,
					strokeColor.key!
				)
			);
		} else if (strokeColor?.type === ColorTypes.RGB) {
			this.operators.push(
				setStrokingRgbColor(strokeColor.red!, strokeColor.green!, strokeColor.blue!)
			);
		} else if (strokeColor?.type === ColorTypes.Grayscale) {
			this.operators.push(setStrokingGrayscaleColor(strokeColor.gray!));
		}
		if (typeof strokeWidth === 'number') {
			this.operators.push(setLineWidth(strokeWidth));
		}
		this.operators.push(fillAndStroke());
		return this;
	}

	getOperators() {
		return this.operators;
	}
	pushOperators(page: PDFPage, config: { isolate: boolean }) {
		if (config.isolate) {
			page.pushOperators(pushGraphicsState());
		}
		page.pushOperators(...this.getOperators());
		if (config.isolate) {
			page.pushOperators(popGraphicsState());
		}
		return this;
	}

	/**
	 * @example
	 * ```ts
	 * PathBuilder.ellipsePath(page, {
	 * 	x: 20,
	 * 	y: 30,
	 * 	xRadius: 200,
	 * 	yRadius: 150,
	 * });
	 * ```
	 * @param page page
	 * @param config ellipse config
	 * @returns PathBuilderInstance
	 */
	static ellipsePath(page: PDFPage, config: EllipseConfig) {
		const { isolate = true, ...rest } = config;
		const builder = new PathBuilder().ellipse(
			rest.x + rest.xRadius / 2,
			rest.fromTop !== false
				? yFromTop(page, rest.y, rest.yRadius / 2)
				: rest.y + rest.yRadius / 2,
			rest.xRadius / 2,
			rest.yRadius / 2
		);
		return new PathBuilderInstance<EllipseConfig>(builder, { ...rest, isolate }, page);
	}

	/**
	 * @example
	 * ```ts
	 * PathBuilder.rectPath(page, {
	 * 	x: 20,
	 * 	y: 30,
	 * 	width: 200,
	 * 	height: 150,
	 * 	radius: 2,
	 * });
	 * ```
	 * @param page page
	 * @param config rect config
	 * @returns PathBuilderInstance
	 */
	static rectPath(page: PDFPage, config: RectConfig) {
		const { isolate = true, ...rest } = config;
		const yPdf = rest.fromTop !== false ? yFromTop(page, rest.y, rest.height) : rest.y;
		const builder = new PathBuilder().rect(
			rest.x,
			yPdf,
			rest.width,
			rest.height,
			rest.radius ?? 0
		);
		return new PathBuilderInstance<RectConfig>(builder, { ...rest, isolate }, page);
	}
}

/**
 * Chainable instance for applying a built path to a PDF page, with config for fill, stroke, dash, etc.
 *
 * Use pushOperators() to apply the path and styles to the page, respecting isolate and fromTop.
 * Use clip() to restrict drawing to the path shape.
 *
 * @template TConfig Path config type (RectConfig, EllipseConfig, etc)
 */
class PathBuilderInstance<TConfig extends { x: number; y: number } = RectConfig> {
	constructor(
		private builder: PathBuilder,
		private config: TConfig,
		private page: PDFPage
	) {}

	private hasFill(obj: unknown): obj is { fill: Color } {
		return (
			typeof obj === 'object' &&
			obj !== null &&
			'fill' in obj &&
			(obj as Record<string, unknown>).fill !== undefined
		);
	}
	private hasStroke(obj: unknown): obj is { stroke: Color; strokeWidth?: number } {
		return (
			typeof obj === 'object' &&
			obj !== null &&
			'stroke' in obj &&
			(obj as Record<string, unknown>).stroke !== undefined
		);
	}
	private hasHeight(obj: unknown): obj is { height: number } {
		return (
			typeof obj === 'object' &&
			obj !== null &&
			'height' in obj &&
			typeof (obj as Record<string, unknown>).height === 'number'
		);
	}
	private hasYRadius(obj: unknown): obj is { yRadius: number } {
		return (
			typeof obj === 'object' &&
			obj !== null &&
			'yRadius' in obj &&
			typeof (obj as Record<string, unknown>).yRadius === 'number'
		);
	}
	private hasDash(obj: unknown): obj is { dashArray: number[]; dashPhase?: number } {
		return (
			typeof obj === 'object' &&
			obj !== null &&
			'dashArray' in obj &&
			Array.isArray((obj as Record<string, unknown>).dashArray)
		);
	}
	private hasIsolate(obj: unknown): obj is { isolate: boolean } {
		return (
			typeof obj === 'object' &&
			obj !== null &&
			'isolate' in obj &&
			typeof (obj as Record<string, unknown>).isolate === 'boolean'
		);
	}

	/**
	 * Apply the path and its styles to the page, respecting config (fill, stroke, dash, isolate, etc).
	 *
	 * @returns this (for chaining)
	 */
	pushOperators() {
		if (this.hasIsolate(this.config)) {
			this.page.pushOperators(pushGraphicsState());
		}
		if (this.hasFill(this.config) && this.hasStroke(this.config)) {
			this.builder.fillAndStroke(
				this.config.fill,
				this.config.stroke,
				this.config.strokeWidth
			);
		} else if (this.hasFill(this.config)) {
			this.builder.fill(this.config.fill);
		} else if (this.hasStroke(this.config)) {
			this.builder.stroke(this.config.stroke, this.config.strokeWidth);
		}

		if (this.hasDash(this.config)) {
			this.page.pushOperators(
				setDashPattern(this.config.dashArray, this.config.dashPhase ?? 0)
			);
		}
		this.page.pushOperators(...this.builder.getOperators());
		if (this.hasIsolate(this.config)) {
			this.page.pushOperators(popGraphicsState());
		}
		return this;
	}

	/**
	 * Restrict drawing to the current path (clip), then run a callback to draw inside the clipped area.
	 *
	 * @param callback Function that receives the page and the top/left coordinates of the clipped area
	 * @returns this (for chaining)
	 */
	clip(callback: (params: { page: PDFPage; top: number; left: number }) => void) {
		this.page.pushOperators(pushGraphicsState());
		this.page.pushOperators(...this.builder.getOperators());
		this.page.pushOperators(clipEvenOdd(), endPath());
		let height = 0;
		if (this.hasHeight(this.config)) {
			height = this.config.height;
		} else if (this.hasYRadius(this.config)) {
			height = this.config.yRadius * 2;
		}
		callback({
			page: this.page,
			top: yFromTop(this.page, this.config.y, height),
			left: this.config.x,
		});
		this.page.pushOperators(popGraphicsState());
		return this;
	}
}
