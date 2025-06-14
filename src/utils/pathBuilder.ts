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

// --- Types and helpers for new API ---
export type RoundedRectConfig = {
	x: number;
	y: number; // from top
	width: number;
	height: number;
	radius: number;
	stroke?: Color;
	strokeWidth?: number;
	strokeOpacity?: number;
	fill?: Color;
	fillOpacity?: number;
};

function yFromTop(page: PDFPage, y: number, height: number) {
	return page.getHeight() - y - height;
}

class PathBuilderInstance {
	constructor(
		private builder: PathBuilder,
		private config: RoundedRectConfig,
		private page: PDFPage
	) {}

	clip(callback: (page: PDFPage, top: number, left: number) => void) {
		this.page.pushOperators(pushGraphicsState());
		this.page.pushOperators(...this.builder.getOperators());
		this.page.pushOperators(clipEvenOdd(), endPath());
		callback(
			this.page,
			yFromTop(this.page, this.config.y, this.config.height),
			this.config.x
		);
		this.page.pushOperators(popGraphicsState());
		return this;
	}

	pushOperators() {
		// Fill/stroke if specified in config
		if (this.config.fill) {
			this.builder.fill(this.config.fill);
		}
		if (this.config.stroke) {
			this.builder.stroke(this.config.stroke, this.config.strokeWidth);
		}
		this.page.pushOperators(...this.builder.getOperators());
		return this;
	}
}

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

	rect(x: number, y: number, width: number, height: number) {
		return this.moveTo(x, y)
			.lineTo(x + width, y)
			.lineTo(x + width, y + height)
			.lineTo(x, y + height)
			.closePath();
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
	pushOperators(page: PDFPage) {
		page.pushOperators(...this.getOperators());
		return this;
	}

	static ellipsePath(x: number, y: number, xRadius: number, yRadius: number) {
		return new PathBuilder().ellipse(x, y, xRadius, yRadius);
	}

	static rectPath(x: number, y: number, width: number, height: number) {
		return new PathBuilder().rect(x, y, width, height);
	}

	/**
	 * Draws a rounded rectangle path (like CSS border-radius).
	 * @param x left
	 * @param y bottom
	 * @param width
	 * @param height
	 * @param radius corner radius (max: half of width/height)
	 */
	roundedRect(x: number, y: number, width: number, height: number, radius: number) {
		const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
		const right = x + width;
		const top = y + height;
		const left = x;
		const bottom = y;
		const KAPPA = 0.5522847498307936; // (4/3)*tan(pi/8)
		const c = r * KAPPA;
		return this.moveTo(left + r, bottom)
			.lineTo(right - r, bottom)
			.appendBezierCurve(right - r + c, bottom, right, bottom + r - c, right, bottom + r)
			.lineTo(right, top - r)
			.appendBezierCurve(right, top - r + c, right - r + c, top, right - r, top)
			.lineTo(left + r, top)
			.appendBezierCurve(left + r - c, top, left, top - r + c, left, top - r)
			.lineTo(left, bottom + r)
			.appendBezierCurve(left, bottom + r - c, left + r - c, bottom, left + r, bottom)
			.closePath();
	}

	static roundedRectPath(page: PDFPage, config: RoundedRectConfig) {
		const { x, y, width, height, radius } = config;
		const yPdf = yFromTop(page, y, height);
		const builder = new PathBuilder().roundedRect(x, yPdf, width, height, radius);
		return new PathBuilderInstance(builder, config, page);
	}
}
