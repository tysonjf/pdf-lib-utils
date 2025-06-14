# pdf-lib-utils

A utility library for advanced text and path drawing with [`@cantoo/pdf-lib`](https://github.com/cantoo/pdf-lib).

This package provides helpers for drawing multi-line and single-line text with alignment, justification, overflow handling, and styled parts, as well as utilities for building and drawing complex paths (rectangles, ellipses, etc) on PDF pages.

---

## Installation

```
npm install pdf-lib @cantoo/pdf-lib pdf-lib-utils
```

---

## Quick Start

```ts
import { PDFDocument } from '@cantoo/pdf-lib';
import { drawTextArea, drawTextLine, PathBuilder, yFromTop, TextPart } from 'pdf-lib-utils';

const doc = await PDFDocument.create();
const page = doc.addPage([300, 400]);

// Example font loading (see @cantoo/pdf-lib docs for details)
const font = await doc.embedFont(...);

const parts: TextPart[] = [
  { text: 'Hello,', font, fontSize: 24 },
  { text: 'world!', font, fontSize: 24 },
  { text: 'This is a long line that should wrap automatically.', font, fontSize: 14 },
  { text: 'New line here.', font, newLine: true, fontSize: 18 },
  { text: 'Continued...', font, fontSize: 14 },
];

drawTextArea(page, {
  parts,
  x: 20,
  y: 300,
  width: 200,
  height: 150,
  align: 'center',
  verticalAlign: 'middle',
});

// Drawn on a single line, justified by parts.
// You can also justify by words (justifyWords) or by parts (justifyParts).
drawTextLine(page, {
  parts: [
    { text: 'Hello', font, fontSize: 12 },
    { text: 'World!', font, fontSize: 12 }
  ],
  x: 20,
  y: 100,
  width: 200,
  height: 30,
  align: 'justifyParts',
});

// Draw a rounded rectangle
PathBuilder.rectPath(page, {
  x: 20,
  y: 30,
  width: 200,
  height: 150,
  radius: 10,
  stroke: { type: 'CMYK', cyan: 0, magenta: 0, yellow: 1, key: 1 },
  strokeWidth: 4,
}).pushOperators();

// Draw an ellipse with a dashed border
PathBuilder.ellipsePath(page, {
  x: 20,
  y: 30,
  xRadius: 200,
  yRadius: 150,
  stroke: { type: 'CMYK', cyan: 0, magenta: 1, yellow: 0, key: 0 },
  strokeWidth: 4,
  dashArray: [10, 10],
  dashPhase: 0,
}).pushOperators();
```

---

## Coordinate System: y from Top

**All y measurements in this library are specified from the top of the page**, not the bottom (as in raw PDF-lib). This makes it easier to reason about layout. Internally, the utility uses `yFromTop(page, y, height)` to convert to PDF-lib's coordinate system.

---

## Text Utilities

### `drawTextArea(page, params)`

Draws styled text parts in a rectangular area, supporting multi-line, wrapping, alignment, vertical alignment, and overflow handling.

- **Multi-line:** Text is automatically wrapped and split into lines as needed.
- **Flexible overflow:** You can choose to hide overflowing text, clip it, or handle it via a callback.
- **Text parts:** Each part can have its own font, size, color, opacity, and can force a new line with `newLine: true`.

**Params:**

- `page: PDFPage` — The PDF page to draw on.
- `params: DrawTextAreaParams` — Options for text, position, size, alignment, etc.

**Example:**

```ts
drawTextArea(page, {
	parts: sampleTextParts1(font),
	x: 20,
	y: 300,
	width: 200,
	height: 150,
	align: 'center',
	verticalAlign: 'middle',
	hideOnOverflow: false,
});
```

#### Overflow Handling and `onOverflow`

If the text does not fit, you can:

- Set `hideOnOverflow: true` to hide the text if it overflows.
- Set `clipOverflow: true` to only render the lines that fit.
- Provide an `onOverflow` callback to get detailed info about what overflowed:

```ts
drawTextArea(page, {
  ...,
  onOverflow: ({ overflowedLines, overflowedLineIndices, totalLines, renderedLines, overflowed, overflowX, overflowY, message }) => {
    if (overflowed) {
      console.log(message); // e.g. 'Text overflows Y (height)'
      // overflowedLines: array of lines that did not fit
      // overflowedLineIndices: indices of those lines
    }
  },
});
```

### `drawTextLine(page, params)`

Draws a single line of styled text parts, with alignment and justification options. **No wrapping.**

- **Single line only:** If the text does not fit, it is considered overflow.
- **Strict overflow:** You can hide the line, or handle overflow via a callback.
- **Text parts:** Each part can have its own font, size, color, opacity.

**Params:**

- `page: PDFPage` — The PDF page to draw on.
- `params: DrawTextLineParams` — Options for text, position, size, alignment, etc.

**Example:**

```ts
drawTextLine(page, {
	parts: [{ text: 'Hello World', font, fontSize: 12 }],
	x: 20,
	y: 300,
	width: 200,
	height: 150,
	align: 'justifyWords',
	verticalAlign: 'middle',
	hideOnOverflow: true,
	onOverflow: (info) => {
		if (info.overflowed) {
			console.log(info.message); // e.g. 'Text overflows X (width)'
		}
	},
	opacity: 1,
});
```

#### Overflow Handling and `onOverflow`

The `onOverflow` callback for `drawTextLine` provides:

- `overflowed`: boolean
- `overflowX`, `overflowY`: booleans
- `lineWidth`, `maxWidth`, `lineHeight`, `maxHeight`: numbers
- `parts`: the text parts
- `message`: a summary string

---

### `TextPart`

A text fragment with style. Used in `drawTextArea` and `drawTextLine`.

```ts
{
  text: string;
  font: PDFFont;
  fontSize?: number;
  color?: Color;
  opacity?: number;
  newLine?: boolean; // Forces a line break before this part (only for drawTextArea)
}
```

#### `partWidth(part, textOverride?)`

Returns the width of a `TextPart` (or a given string with the part's style).

#### `splitPartToWords(part)`

Splits a `TextPart` into an array of `TextPart`s, one per word (preserving spaces).

---

## Path Utilities

### `PathBuilder`

A chainable builder for PDF path drawing. Supports rectangles, ellipses, lines, and more.

**Instance methods:**

- `moveTo(x, y)`
- `lineTo(x, y)`
- `closePath()`
- `rect(x, y, width, height, radius?)`
- `ellipse(x, y, xRadius, yRadius)`
- `appendBezierCurve(x1, y1, x2, y2, x3, y3)`
- `fill(color)`
- `stroke(color, width?)`
- `fillAndStroke(fillColor, strokeColor, strokeWidth?)`
- `getOperators()`
- `pushOperators(page)`

**Static helpers:**

- `PathBuilder.rectPath(page, config)` — Quickly create and draw a rectangle (optionally rounded).
- `PathBuilder.ellipsePath(page, config)` — Quickly create and draw an ellipse.

### Clipping Content to a Path

You can use `.clip()` on a `PathBuilderInstance` to restrict drawing (e.g., images) to a custom shape:

```ts
PathBuilder.ellipsePath(page, {
  x: 20,
  y: 30,
  xRadius: 200,
  yRadius: 150,
  stroke: ..., // optional
  strokeWidth: ...,
  dashArray: ...,
})
  .clip(({ page, left, top }) => {
    page.drawImage(image, {
      x: left,
      y: yFromTop(page, 30, 200),
      width: 200,
      height: 200,
      opacity: 1,
    });
  })
  // You can also push the operators for the path to apply the styles of the ellipse (eg. border)
  .pushOperators();
```

This lets you mask any content (images, text, etc.) to a path.

---

## Graphics State Isolation

All utilities automatically save and restore the PDF graphics state using `pushGraphicsState` and `popGraphicsState`. This means that colors, opacity, and other styles set for one drawing operation **do not affect** subsequent drawings. You can safely mix and match text, shapes, and images without worrying about style bleed.

---

## License

MIT
