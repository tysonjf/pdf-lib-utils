// pdf-doc.ts (updated with vertical alignment and per-part styles)
import { type Font } from 'fontkit';

type TextOptions = {
	wrap?: boolean;
	align?: 'left' | 'center' | 'right' | 'justify-between';
	verticalAlign?: 'top' | 'middle' | 'bottom';
};

type TextPart = {
	text: string;
	font?: string;
	fontSize?: number;
	newLine?: boolean;
	color?: string | [number, number, number] | [number, number, number, number]; // hex, rgb, cmyk
	opacity?: number;
};

const MM_TO_PT = 72 / 25.4;

type FontEntry = {
	font: Font;
	fontBuffer: ArrayBuffer;
};

export class PDFDocument {
	private objects: string[] = [];
	private offsets: number[] = [];
	private objectCount = 0;
	private pageContent: string[] = [];
	private registeredFonts = new Map<string, FontEntry>();
	private fontObjectIds = new Map<string, number>();
	private widthPt: number;
	private heightPt: number;
	private defaultFont = 'Default';
	private defaultFontSize = 12;

	constructor(private widthMM: number, private heightMM: number) {
		this.widthPt = widthMM * MM_TO_PT;
		this.heightPt = heightMM * MM_TO_PT;
	}

	async registerFont(name: string, buffer: ArrayBuffer) {
		const fontkit = await import('fontkit');
		const font = fontkit.create(buffer);
		this.registeredFonts.set(name, { font, fontBuffer: buffer });
	}

	private encodeTextUnicode(font: Font, text: string): string {
		const glyphs = font.layout(text).glyphs;
		const hex = glyphs.map((g) => g.id.toString(16).padStart(4, '0')).join('');
		return `<${hex}>`;
	}

	private getColorOps(color: TextPart['color'], opacity?: number): string {
		if (!color) return '';
		const alpha = opacity != null ? `/${opacity.toFixed(2)} gs` : '';
		if (typeof color === 'string') {
			const hex = color.replace('#', '');
			if (hex.length === 3) {
				const r = parseInt(hex[0] + hex[0], 16) / 255;
				const g = parseInt(hex[1] + hex[1], 16) / 255;
				const b = parseInt(hex[2] + hex[2], 16) / 255;
				return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${alpha}`;
			} else if (hex.length === 6) {
				const r = parseInt(hex.slice(0, 2), 16) / 255;
				const g = parseInt(hex.slice(2, 4), 16) / 255;
				const b = parseInt(hex.slice(4, 6), 16) / 255;
				return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${alpha}`;
			}
		} else if (Array.isArray(color)) {
			if (color.length === 3) {
				const [r, g, b] = color;
				return `${r} ${g} ${b} rg ${alpha}`;
			}
			if (color.length === 4) {
				const [c, m, y, k] = color;
				return `${c} ${m} ${y} ${k} k ${alpha}`;
			}
		}
		return '';
	}

	public addTextParts(
		parts: TextPart[],
		x: number,
		y: number,
		width: number,
		height: number,
		options: TextOptions = {}
	) {
		const wrap = options.wrap !== false;
		const align = options.align || 'left';
		const verticalAlign = options.verticalAlign || 'top';
		const tx = x * MM_TO_PT;
		const maxWidthPt = width * MM_TO_PT;
		const maxHeightPt = height * MM_TO_PT;
		const topY = this.heightPt - y * MM_TO_PT;

		let currentY = topY;
		const lines: TextPart[][] = [];
		let currentLine: TextPart[] = [];
		let currentLineWidth = 0;
		let maxLineHeight = 0;

		const measurePart = (part: TextPart): number => {
			const fontName = part.font || this.defaultFont;
			const fontSize = part.fontSize || this.defaultFontSize;
			const entry = this.registeredFonts.get(fontName);
			if (!entry) throw new Error(`Font "${fontName}" not registered.`);
			const scale = fontSize / entry.font.unitsPerEm;
			const width = entry.font
				.layout(part.text)
				.glyphs.reduce((w, g) => w + g.advanceWidth * scale, 0);
			return width;
		};

		const flushLine = () => {
			if (currentLine.length > 0) {
				lines.push(currentLine);
				currentLine = [];
				currentLineWidth = 0;
				maxLineHeight = 0;
			}
		};

		for (const part of parts) {
			const widthPt = measurePart(part);
			const heightPt = (part.fontSize || this.defaultFontSize) * 1.2;

			if (
				part.newLine ||
				(!wrap && currentLineWidth + widthPt > maxWidthPt) ||
				(wrap && currentLineWidth + widthPt > maxWidthPt && currentLine.length > 0)
			) {
				flushLine();
			}

			currentLine.push(part);
			currentLineWidth += widthPt;
			maxLineHeight = Math.max(maxLineHeight, heightPt);
		}
		flushLine();

		const totalHeight = lines.reduce(
			(sum, line) =>
				sum + Math.max(...line.map((p) => (p.fontSize || this.defaultFontSize) * 1.2)),
			0
		);
		if (verticalAlign === 'middle') {
			currentY = topY - (maxHeightPt - totalHeight) / 2;
		} else if (verticalAlign === 'bottom') {
			currentY = topY - (maxHeightPt - totalHeight);
		}

		for (const line of lines) {
			const lineHeight = Math.max(
				...line.map((p) => (p.fontSize || this.defaultFontSize) * 1.2)
			);
			const lineWidth = line.reduce((sum, p) => sum + measurePart(p), 0);
			let xCursor = tx;

			if (align === 'center') {
				xCursor = tx + (maxWidthPt - lineWidth) / 2;
			} else if (align === 'right') {
				xCursor = tx + (maxWidthPt - lineWidth);
			} else if (align === 'justify-between' && line.length > 1) {
				const space = (maxWidthPt - lineWidth) / (line.length - 1);
				for (let i = 0; i < line.length; i++) {
					const part = line[i];
					const fontName = part.font || this.defaultFont;
					const fontSize = part.fontSize || this.defaultFontSize;
					const entry = this.registeredFonts.get(fontName)!;
					const encoded = this.encodeTextUnicode(entry.font, part.text);
					const colorOps = this.getColorOps(part.color, part.opacity);
					this.pageContent.push(
						`BT /${fontName} ${fontSize} Tf ${colorOps} ${xCursor.toFixed(2)} ${(
							currentY - fontSize
						).toFixed(2)} Td ${encoded} Tj ET`
					);
					xCursor += measurePart(part) + space;
				}
				currentY -= lineHeight;
				continue;
			}

			for (const part of line) {
				const fontName = part.font || this.defaultFont;
				const fontSize = part.fontSize || this.defaultFontSize;
				const entry = this.registeredFonts.get(fontName)!;
				const encoded = this.encodeTextUnicode(entry.font, part.text);
				const colorOps = this.getColorOps(part.color, part.opacity);
				this.pageContent.push(
					`BT /${fontName} ${fontSize} Tf ${colorOps} ${xCursor.toFixed(2)} ${(
						currentY - fontSize
					).toFixed(2)} Td ${encoded} Tj ET`
				);
				xCursor += measurePart(part);
			}
			currentY -= lineHeight;
		}
	}
}
